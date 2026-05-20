import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Row = { query: string; results_count: number; clicked_product_slug: string | null; created_at: string };

export function SearchTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("search_logs" as any).select("query, results_count, clicked_product_slug, created_at").order("created_at", { ascending: false }).limit(2000);
      setRows(((data as any[]) ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const top = new Map<string, number>();
    const zero = new Map<string, number>();
    const products = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.query.trim().toLowerCase();
      top.set(k, (top.get(k) ?? 0) + 1);
      if (!r.results_count) zero.set(k, (zero.get(k) ?? 0) + 1);
      if (r.clicked_product_slug) products.set(r.clicked_product_slug, (products.get(r.clicked_product_slug) ?? 0) + 1);
    });
    const sort = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    return { top: sort(top), zero: sort(zero), products: sort(products), total: rows.length };
  }, [rows]);

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Búsquedas totales" value={stats.total} />
        <Stat label="Términos únicos" value={stats.top.length} />
        <Stat label="Sin resultados" value={stats.zero.length} tone="warn" />
        <Stat label="Productos clickeados" value={stats.products.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Búsquedas más frecuentes" rows={stats.top} />
        <ListCard title="Búsquedas sin resultados" rows={stats.zero} emptyText="Sin búsquedas vacías 🎉" tone="warn" />
        <ListCard title="Productos más encontrados" rows={stats.products} />
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: any; tone?: "warn" }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display text-2xl ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
  </div>
);

const ListCard = ({ title, rows, emptyText, tone }: { title: string; rows: [string, number][]; emptyText?: string; tone?: "warn" }) => (
  <div className="rounded-lg border bg-background">
    <div className="border-b p-3 text-sm font-semibold">{title}</div>
    <ul className="divide-y">
      {rows.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-2 p-3 text-sm">
          <span className="truncate">{k}</span>
          <Badge variant={tone === "warn" ? "destructive" : "outline"}>{v}</Badge>
        </li>
      ))}
      {!rows.length && <li className="p-6 text-center text-sm text-muted-foreground">{emptyText ?? "Sin datos"}</li>}
    </ul>
  </div>
);
