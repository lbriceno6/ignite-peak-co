import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Agg = { key: string; label: string; count: number };

export function PerformanceTab() {
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<Agg[]>([]);
  const [adds, setAdds] = useState<Agg[]>([]);
  const [purchases, setPurchases] = useState<Agg[]>([]);
  const [searches, setSearches] = useState<Agg[]>([]);
  const [landings, setLandings] = useState<Agg[]>([]);
  const [zeroSearches, setZeroSearches] = useState<Agg[]>([]);
  const [waClicks, setWaClicks] = useState<number>(0);
  const [conv, setConv] = useState<{ slug: string; views: number; purchases: number; rate: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("product_events" as any)
        .select("event_type, product_slug, landing_slug")
        .gte("created_at", since)
        .limit(50000);

      const bucket = (type: string, field: "product_slug" | "landing_slug") => {
        const m = new Map<string, number>();
        ((events ?? []) as any[]).forEach((e) => {
          if (e.event_type !== type) return;
          const k = e[field]; if (!k) return;
          m.set(k, (m.get(k) ?? 0) + 1);
        });
        return Array.from(m.entries()).map(([k, c]) => ({ key: k, label: k, count: c }))
          .sort((a, b) => b.count - a.count).slice(0, 10);
      };

      const v = bucket("view_item", "product_slug");
      const a = bucket("add_to_cart", "product_slug");
      const l = bucket("landing_page_view", "landing_slug");
      const wa = ((events ?? []) as any[]).filter((e) => e.event_type === "whatsapp_click").length;
      setViews(v); setAdds(a); setLandings(l); setWaClicks(wa);

      // Real purchases (from orders/order_items)
      const { data: items } = await supabase
        .from("order_items")
        .select("product_slug, quantity, orders!inner(status, created_at)")
        .gte("orders.created_at", since)
        .in("orders.status", ["confirmed", "preparing", "shipped", "delivered"]);
      const pMap = new Map<string, number>();
      ((items ?? []) as any[]).forEach((i) => pMap.set(i.product_slug, (pMap.get(i.product_slug) ?? 0) + (i.quantity ?? 1)));
      const p = Array.from(pMap.entries()).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10);
      setPurchases(p);

      // Conversión por producto
      const allViewSlugs = new Map<string, number>();
      ((events ?? []) as any[]).forEach((e) => {
        if (e.event_type === "view_item" && e.product_slug)
          allViewSlugs.set(e.product_slug, (allViewSlugs.get(e.product_slug) ?? 0) + 1);
      });
      const convRows = Array.from(allViewSlugs.entries()).map(([slug, vw]) => {
        const pu = pMap.get(slug) ?? 0;
        return { slug, views: vw, purchases: pu, rate: vw > 0 ? (pu / vw) * 100 : 0 };
      }).sort((x, y) => y.rate - x.rate).slice(0, 15);
      setConv(convRows);

      // Internal searches
      const { data: search } = await supabase.from("search_logs" as any).select("query, results_count").gte("created_at", since).limit(5000);
      const sMap = new Map<string, number>();
      const zMap = new Map<string, number>();
      ((search ?? []) as any[]).forEach((s) => {
        sMap.set(s.query, (sMap.get(s.query) ?? 0) + 1);
        if ((s.results_count ?? 0) === 0) zMap.set(s.query, (zMap.get(s.query) ?? 0) + 1);
      });
      setSearches(Array.from(sMap.entries()).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10));
      setZeroSearches(Array.from(zMap.entries()).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10));

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-muted-foreground"><Loader2 className="inline animate-spin" size={14} /> Cargando métricas…</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Datos de los últimos 30 días, basados en eventos del sitio.</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <List title="Productos más vistos" rows={views} />
        <List title="Productos más agregados al carrito" rows={adds} />
        <List title="Productos más comprados" rows={purchases} suffix="uds" />
        <List title="Búsquedas internas más frecuentes" rows={searches} />
        <List title="Búsquedas sin resultados" rows={zeroSearches} />
        <List title="Landings más visitadas" rows={landings} />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="text-xs text-muted-foreground">Clics en WhatsApp (30 días)</div>
        <div className="mt-1 font-display text-3xl">{waClicks}</div>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b p-3 text-sm font-semibold">Conversión por producto</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Producto (slug)</th><th className="p-3">Vistas</th><th className="p-3">Compras</th><th className="p-3">Conversión</th></tr>
          </thead>
          <tbody>
            {conv.map((c) => (
              <tr key={c.slug} className="border-t">
                <td className="p-3">{c.slug}</td>
                <td className="p-3">{c.views}</td>
                <td className="p-3">{c.purchases}</td>
                <td className="p-3 font-semibold">{c.rate.toFixed(2)}%</td>
              </tr>
            ))}
            {conv.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sin datos suficientes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const List = ({ title, rows, suffix }: { title: string; rows: Agg[]; suffix?: string }) => (
  <div className="rounded-lg border bg-background">
    <div className="border-b p-3 text-sm font-semibold">{title}</div>
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between p-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="font-mono text-xs">{r.count}{suffix ? ` ${suffix}` : ""}</span>
        </li>
      ))}
      {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Sin datos</li>}
    </ul>
  </div>
);
