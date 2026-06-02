// Phase 12 — A/B Testing dashboard for prompt variants.
// For each AI function, lists all variants that received at least one click in
// the window, and computes clicks, attributed orders (7d window post-click via
// visitor_id), CVR, and revenue per variant.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Trophy, Sparkles, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ATTRIBUTION_WINDOW_DAYS = 7;

type Click = { visitor_id: string | null; metadata: any; created_at: string };
type OrderRow = { id: string; visitor_id: string | null; total: number; created_at: string };
type Version = {
  id: string;
  function_name: string;
  variant_label: string | null;
  traffic_weight: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

const FN_LABELS: Record<string, string> = {
  "ai-cart-recommendations": "Carrito",
  "ai-product-related": "Ficha de producto",
  "ai-post-purchase": "Post-compra",
};

export function AiAbTesting() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, any>>({});

  const runAutoPromote = async (fnName: string, apply: boolean) => {
    setBusy(`${fnName}:${apply ? "apply" : "dry"}`);
    try {
      const { data, error } = await (supabase as any).functions.invoke("ai-auto-promote", {
        body: { function_name: fnName, window_days: windowDays, apply },
      });
      if (error) throw error;
      setLastResult((p) => ({ ...p, [fnName]: data }));
      if (data?.applied) {
        toast.success(`Variante promovida: ${data.winner?.label ?? data.winner?.prompt_id?.slice(0, 6)}`);
        // reload versions
        const { data: vers } = await (supabase as any)
          .from("ai_prompt_versions")
          .select("id, function_name, variant_label, traffic_weight, is_active, notes, created_at")
          .order("created_at", { ascending: false });
        setVersions((vers ?? []) as Version[]);
      } else {
        toast.message(data?.reason ?? "Sin cambios");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const sinceOrders = new Date(
        Date.now() - (windowDays + ATTRIBUTION_WINDOW_DAYS) * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [evRes, ordRes, verRes] = await Promise.all([
        (supabase as any)
          .from("lucia_events")
          .select("visitor_id, metadata, created_at")
          .eq("event_type", "ai_reco_click")
          .gte("created_at", since)
          .limit(10000),
        (supabase as any)
          .from("orders")
          .select("id, visitor_id, total, created_at")
          .gte("created_at", sinceOrders)
          .not("visitor_id", "is", null)
          .in("status", ["confirmed", "preparing", "shipped", "delivered"])
          .limit(10000),
        (supabase as any)
          .from("ai_prompt_versions")
          .select("id, function_name, variant_label, traffic_weight, is_active, notes, created_at")
          .order("created_at", { ascending: false }),
      ]);
      setClicks((evRes?.data ?? []) as Click[]);
      setOrders((ordRes?.data ?? []) as OrderRow[]);
      setVersions((verRes?.data ?? []) as Version[]);
      setLoading(false);
    })();
  }, [windowDays]);

  const byFunction = useMemo(() => {
    // Orders by visitor for fast lookup
    const ordersByVisitor = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (!o.visitor_id) continue;
      const arr = ordersByVisitor.get(o.visitor_id) ?? [];
      arr.push(o);
      ordersByVisitor.set(o.visitor_id, arr);
    }
    const winMs = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // Map function_name → prompt_id → stats
    const result = new Map<string, Map<string, {
      promptId: string | null;
      clicks: number;
      visitors: Set<string>;
      orders: Set<string>;
      revenue: number;
    }>>();

    for (const c of clicks) {
      const src = (c.metadata?.source ?? "") as string;
      // Map source back to function name
      const fnName =
        src === "ai_cart" || src === "ai_checkout" ? "ai-cart-recommendations" :
        src === "ai_product_related" ? "ai-product-related" :
        src === "ai_post_purchase" ? "ai-post-purchase" :
        null;
      if (!fnName) continue;
      const promptId = (c.metadata?.ai_prompt_id ?? null) as string | null;
      const key = promptId ?? "__default__";
      let fnMap = result.get(fnName);
      if (!fnMap) { fnMap = new Map(); result.set(fnName, fnMap); }
      let agg = fnMap.get(key);
      if (!agg) {
        agg = { promptId, clicks: 0, visitors: new Set(), orders: new Set(), revenue: 0 };
        fnMap.set(key, agg);
      }
      agg.clicks += 1;
      if (!c.visitor_id) continue;
      agg.visitors.add(c.visitor_id);
      const clickTs = new Date(c.created_at).getTime();
      for (const o of ordersByVisitor.get(c.visitor_id) ?? []) {
        const ots = new Date(o.created_at).getTime();
        if (ots >= clickTs && ots - clickTs <= winMs && !agg.orders.has(o.id)) {
          agg.orders.add(o.id);
          agg.revenue += Number(o.total) || 0;
        }
      }
    }
    return result;
  }, [clicks, orders]);

  const findVersion = (fnName: string, promptId: string | null) => {
    if (!promptId) return null;
    return versions.find((v) => v.function_name === fnName && v.id === promptId) ?? null;
  };

  if (loading) return <p className="text-muted-foreground">Cargando A/B…</p>;

  const fnNames = Object.keys(FN_LABELS);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl flex items-center gap-2">
            <FlaskConical size={18} /> A/B testing de prompts
          </h2>
          <p className="text-sm text-muted-foreground">
            Compara variantes activas de cada función. Atribución por <code className="text-xs">visitor_id</code> dentro
            de {ATTRIBUTION_WINDOW_DAYS} días post-click.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={windowDays === d ? "default" : "outline"}
              size="sm"
              onClick={() => setWindowDays(d as any)}
            >{d}d</Button>
          ))}
        </div>
      </div>

      {fnNames.map((fn) => {
        const fnMap = byFunction.get(fn);
        const variants = fnMap ? [...fnMap.values()] : [];
        if (variants.length === 0) {
          return (
            <Card key={fn}>
              <CardHeader>
                <CardTitle className="text-base">{FN_LABELS[fn]}</CardTitle>
                <CardDescription>Sin clicks atribuibles a variantes en este período.</CardDescription>
              </CardHeader>
            </Card>
          );
        }
        const rows = variants
          .map((v) => ({
            ...v,
            cvr: v.visitors.size > 0 ? (v.orders.size / v.visitors.size) * 100 : 0,
            rpc: v.clicks > 0 ? v.revenue / v.clicks : 0,
            version: findVersion(fn, v.promptId),
          }))
          .sort((a, b) => b.rpc - a.rpc);
        const winner = rows[0];
        return (
          <Card key={fn}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {FN_LABELS[fn]}
                    {winner && rows.length > 1 && (
                      <Badge variant="default" className="ml-2">
                        <Trophy size={12} className="mr-1" /> Líder por RPC
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {rows.length} variante{rows.length !== 1 ? "s" : ""} con datos en los últimos {windowDays} días.
                  </CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy?.startsWith(fn) || rows.length < 2}
                    onClick={() => runAutoPromote(fn, false)}
                  >
                    {busy === `${fn}:dry` ? <Loader2 size={14} className="mr-1 animate-spin" /> : <PlayCircle size={14} className="mr-1" />}
                    Simular
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy?.startsWith(fn) || rows.length < 2}
                    onClick={() => runAutoPromote(fn, true)}
                  >
                    {busy === `${fn}:apply` ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
                    Auto-promover ganador
                  </Button>
                </div>
              </div>
              {lastResult[fn]?.reason && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última decisión: {lastResult[fn].reason}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Visitantes</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">RPC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.promptId ?? "default"}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {i === 0 && rows.length > 1 && <Trophy size={12} className="text-amber-500" />}
                          <span className="font-medium">
                            {r.version?.variant_label ?? (r.promptId ? r.promptId.slice(0, 6) : "Sin versión (fallback código)")}
                          </span>
                          {r.version?.is_active === false && <Badge variant="outline">inactiva</Badge>}
                        </div>
                        {r.version?.notes && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{r.version.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>{r.version?.traffic_weight ?? "—"}%</TableCell>
                      <TableCell className="text-right">{r.clicks}</TableCell>
                      <TableCell className="text-right">{r.visitors.size}</TableCell>
                      <TableCell className="text-right">{r.orders.size}</TableCell>
                      <TableCell className="text-right">{r.cvr.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{r.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.rpc.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
