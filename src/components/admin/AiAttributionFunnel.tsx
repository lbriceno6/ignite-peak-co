// Phase 10 — Fine-grained AI attribution funnel.
// Joins `lucia_events` (ai_reco_click) to `orders` via `visitor_id` within a
// 7-day post-click attribution window and computes, per AI source:
//   - clicks
//   - visitors who clicked
//   - visitors who then placed an order (within window)
//   - orders attributed
//   - attributed revenue (sum of order.total for those orders)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  ai_cart: "Carrito",
  ai_checkout: "Checkout",
  ai_product_related: "Ficha de producto",
  ai_post_purchase: "Post-compra",
  ai_home_recommended: "Home — recomendado",
  ai_home_dynamic_banner: "Home — banner dinámico",
};

const ATTRIBUTION_WINDOW_DAYS = 7;

type ClickRow = { visitor_id: string | null; metadata: any; created_at: string };
type OrderRow = { id: string; visitor_id: string | null; total: number; created_at: string };

export function AiAttributionFunnel() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      // Orders look-up window must extend ATTRIBUTION_WINDOW_DAYS past the clicks window
      // so we catch purchases that happened after a click near the end.
      const sinceOrders = new Date(
        Date.now() - (windowDays + ATTRIBUTION_WINDOW_DAYS) * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [evRes, ordRes] = await Promise.all([
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
          .in("status", ["confirmed", "preparing", "shipped", "delivered"])
          .not("visitor_id", "is", null)
          .limit(10000),
      ]);
      setClicks((evRes?.data ?? []) as ClickRow[]);
      setOrders((ordRes?.data ?? []) as OrderRow[]);
      setLoading(false);
    })();
  }, [windowDays]);

  const rows = useMemo(() => {
    // Group orders by visitor_id sorted by created_at
    const ordersByVisitor = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (!o.visitor_id) continue;
      const arr = ordersByVisitor.get(o.visitor_id) ?? [];
      arr.push(o);
      ordersByVisitor.set(o.visitor_id, arr);
    }

    type Agg = {
      source: string;
      clicks: number;
      uniqueVisitors: Set<string>;
      convertedVisitors: Set<string>;
      attributedOrders: Set<string>;
      revenue: number;
    };
    const bySource = new Map<string, Agg>();
    const ensure = (src: string): Agg => {
      let a = bySource.get(src);
      if (!a) {
        a = {
          source: src,
          clicks: 0,
          uniqueVisitors: new Set(),
          convertedVisitors: new Set(),
          attributedOrders: new Set(),
          revenue: 0,
        };
        bySource.set(src, a);
      }
      return a;
    };

    const winMs = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    for (const c of clicks) {
      const src = (c.metadata?.source ?? "unknown") as string;
      const a = ensure(src);
      a.clicks += 1;
      if (!c.visitor_id) continue;
      a.uniqueVisitors.add(c.visitor_id);
      const clickTs = new Date(c.created_at).getTime();
      const candidates = ordersByVisitor.get(c.visitor_id) ?? [];
      for (const o of candidates) {
        const ots = new Date(o.created_at).getTime();
        if (ots >= clickTs && ots - clickTs <= winMs) {
          if (!a.attributedOrders.has(o.id)) {
            a.attributedOrders.add(o.id);
            a.revenue += Number(o.total) || 0;
          }
          a.convertedVisitors.add(c.visitor_id);
        }
      }
    }

    return [...bySource.values()]
      .map((a) => ({
        source: a.source,
        clicks: a.clicks,
        visitors: a.uniqueVisitors.size,
        converted: a.convertedVisitors.size,
        orders: a.attributedOrders.size,
        revenue: a.revenue,
        cvr: a.uniqueVisitors.size > 0 ? (a.convertedVisitors.size / a.uniqueVisitors.size) * 100 : 0,
        rpc: a.clicks > 0 ? a.revenue / a.clicks : 0,
      }))
      .sort((x, y) => y.revenue - x.revenue);
  }, [clicks, orders]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        clicks: acc.clicks + r.clicks,
        orders: acc.orders + r.orders,
        revenue: acc.revenue + r.revenue,
      }),
      { clicks: 0, orders: 0, revenue: 0 },
    );
  }, [rows]);

  if (loading) return <p className="text-muted-foreground">Cargando atribución…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl flex items-center gap-2">
            <Target size={18} /> Atribución fina IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Pedidos vinculados al mismo <code className="text-xs">visitor_id</code> dentro de los{" "}
            {ATTRIBUTION_WINDOW_DAYS} días posteriores al click en una recomendación IA.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Clicks totales" value={totals.clicks} />
        <Metric label="Pedidos atribuidos" value={totals.orders} />
        <Metric label="Revenue atribuido" value={totals.revenue.toFixed(2)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel por fuente IA</CardTitle>
          <CardDescription>
            CVR = visitantes que compraron tras hacer click / visitantes que clickearon.
            RPC = revenue por click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos suficientes en este período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Visitantes</TableHead>
                  <TableHead className="text-right">Convirtieron</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">CVR</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">RPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.source}>
                    <TableCell className="font-medium">
                      {SOURCE_LABELS[r.source] ?? r.source}
                    </TableCell>
                    <TableCell className="text-right">{r.clicks}</TableCell>
                    <TableCell className="text-right">{r.visitors}</TableCell>
                    <TableCell className="text-right">{r.converted}</TableCell>
                    <TableCell className="text-right">{r.orders}</TableCell>
                    <TableCell className="text-right">{r.cvr.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{r.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.rpc.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
