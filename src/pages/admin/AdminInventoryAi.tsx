// Fase 16 — AI Inventory Forecast admin screen.
// Shows stock velocity per product, days-to-stockout, suggested restock,
// risk badge, and an AI-generated prioritization summary.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Sparkles, RefreshCw, AlertTriangle, TrendingDown, Package } from "lucide-react";

type Item = {
  slug: string; name: string; category: string | null;
  image: string | null; stock: number; sold_window: number;
  daily_velocity: number; days_to_stockout: number | null;
  suggested_restock: number; risk: "critical" | "warning" | "ok" | "no_sales";
};

type Result = {
  window_days: number;
  total_products: number;
  counts: { critical: number; warning: number; ok: number; no_sales: number };
  items: Item[];
  ai: { summary?: string; priorities?: Array<{ slug: string; action: string; reasoning: string }> } | null;
};

const RISK_BADGE: Record<Item["risk"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: { label: "Crítico", variant: "destructive" },
  warning: { label: "Bajo", variant: "default" },
  ok: { label: "OK", variant: "secondary" },
  no_sales: { label: "Sin ventas", variant: "outline" },
};

export default function AdminInventoryAi() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 60 | 90>(30);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "no_sales">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-inventory-forecast", {
      body: { window_days: windowDays },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setData(data as Result);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [windowDays]);

  const items = (data?.items ?? []).filter((it) => filter === "all" ? true : it.risk === filter);

  return (
    <div className="container mx-auto space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={22} /> Predicción de inventario con IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Velocidad de ventas, días a quiebre y sugerencias de reposición priorizadas por IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="60">Últimos 60 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading} variant="outline" size="sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recalcular
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Crítico" value={data?.counts.critical ?? 0} icon={<AlertTriangle size={14} className="text-destructive" />} />
        <Stat label="Bajo stock" value={data?.counts.warning ?? 0} icon={<TrendingDown size={14} />} />
        <Stat label="OK" value={data?.counts.ok ?? 0} />
        <Stat label="Sin ventas" value={data?.counts.no_sales ?? 0} />
      </div>

      {data?.ai && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles size={16} /> Análisis IA
            </CardTitle>
            {data.ai.summary && <CardDescription>{data.ai.summary}</CardDescription>}
          </CardHeader>
          {data.ai.priorities && data.ai.priorities.length > 0 && (
            <CardContent className="space-y-2">
              {data.ai.priorities.map((p, i) => (
                <div key={i} className="rounded-md border bg-card p-3">
                  <p className="text-sm font-medium">
                    {p.action} · <span className="font-mono text-xs">{p.slug}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{p.reasoning}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Productos</CardTitle>
            <CardDescription>
              {items.length} de {data?.total_products ?? 0} mostrados
            </CardDescription>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="critical">Solo críticos</SelectItem>
              <SelectItem value="warning">Solo bajos</SelectItem>
              <SelectItem value="no_sales">Sin ventas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">Velocidad/día</TableHead>
                  <TableHead className="text-right">Días a quiebre</TableHead>
                  <TableHead className="text-right">Reabastecer</TableHead>
                  <TableHead>Riesgo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const r = RISK_BADGE[it.risk];
                  return (
                    <TableRow key={it.slug}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {it.image && <img src={it.image} alt="" className="h-8 w-8 rounded object-cover" />}
                          <div>
                            <p className="text-sm font-medium">{it.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{it.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{it.stock}</TableCell>
                      <TableCell className="text-right">{it.sold_window}</TableCell>
                      <TableCell className="text-right">{it.daily_velocity}</TableCell>
                      <TableCell className="text-right">{it.days_to_stockout ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {it.suggested_restock > 0 ? `+${it.suggested_restock}` : "—"}
                      </TableCell>
                      <TableCell><Badge variant={r.variant}>{r.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      {loading ? "Cargando…" : "Sin datos para este filtro."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
