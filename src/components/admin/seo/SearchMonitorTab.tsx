import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SearchMonitorTab() {
  const [data, setData] = useState<{
    top: { q: string; n: number }[];
    zero: { q: string; n: number }[];
    clicked: { q: string; n: number }[];
    foundProducts: { slug: string; n: number }[];
    cartFromSearch: { q: string; n: number }[];
    purchaseFromSearch: { q: string; n: number }[];
    searchedNotBought: string[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: logs }, { data: events }] = await Promise.all([
        supabase.from("search_logs" as any).select("query, results_count, clicked_product_slug, created_at")
          .gte("created_at", since).limit(5000),
        supabase.from("product_events" as any).select("event_type, metadata, product_slug, session_id")
          .gte("created_at", since).in("event_type", ["search", "add_to_cart", "purchase"]).limit(5000),
      ]);

      const cnt = (arr: any[], key: (x: any) => string | null | undefined) => {
        const m = new Map<string, number>();
        arr.forEach((x) => { const k = key(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
        return [...m.entries()].map(([q, n]) => ({ q, n })).sort((a, b) => b.n - a.n).slice(0, 20);
      };

      const top = cnt(((logs as any[]) ?? []), (l) => l.query?.toLowerCase().trim());
      const zero = cnt(((logs as any[]) ?? []).filter((l) => l.results_count === 0), (l) => l.query?.toLowerCase().trim());
      const clicked = cnt(((logs as any[]) ?? []).filter((l) => l.clicked_product_slug), (l) => l.query?.toLowerCase().trim());
      const foundProducts = cnt(((logs as any[]) ?? []).filter((l) => l.clicked_product_slug), (l) => l.clicked_product_slug).map(({ q, n }) => ({ slug: q, n }));

      // search → cart / purchase by session
      const searchSessions = new Map<string, Set<string>>(); // session -> queries
      ((events as any[]) ?? []).filter((e) => e.event_type === "search").forEach((e) => {
        const q = (e.metadata?.search_term ?? "").toLowerCase().trim();
        if (!q || !e.session_id) return;
        if (!searchSessions.has(e.session_id)) searchSessions.set(e.session_id, new Set());
        searchSessions.get(e.session_id)!.add(q);
      });
      const cartQ = new Map<string, number>(); const purchQ = new Map<string, number>();
      ((events as any[]) ?? []).forEach((e) => {
        if (!e.session_id) return;
        const qs = searchSessions.get(e.session_id);
        if (!qs) return;
        qs.forEach((q) => {
          if (e.event_type === "add_to_cart") cartQ.set(q, (cartQ.get(q) ?? 0) + 1);
          if (e.event_type === "purchase") purchQ.set(q, (purchQ.get(q) ?? 0) + 1);
        });
      });
      const cartFromSearch = [...cartQ.entries()].map(([q, n]) => ({ q, n })).sort((a, b) => b.n - a.n).slice(0, 20);
      const purchaseFromSearch = [...purchQ.entries()].map(([q, n]) => ({ q, n })).sort((a, b) => b.n - a.n).slice(0, 20);

      // searched but never bought
      const purchasedQs = new Set(purchaseFromSearch.map((x) => x.q));
      const searchedNotBought = top.filter((t) => !purchasedQs.has(t.q)).slice(0, 20).map((t) => t.q);

      setData({ top, zero, clicked, foundProducts, cartFromSearch, purchaseFromSearch, searchedNotBought });
    })();
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  const Section = ({ title, items, label = "n" }: { title: string; items: { q?: string; slug?: string; n: number }[]; label?: string }) => (
    <div className="rounded-lg border bg-background">
      <div className="border-b p-3 font-medium">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {items.length === 0 && <tr><td className="p-4 text-center text-muted-foreground">—</td></tr>}
          {items.map((i, idx) => (
            <tr key={idx} className="border-t"><td className="p-2 px-3 text-xs">{i.q ?? i.slug}</td><td className="p-2 px-3 text-right text-muted-foreground">{i.n} {label}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Section title="Términos más buscados" items={data.top} />
      <Section title="Términos sin resultados" items={data.zero} />
      <Section title="Términos con más clics" items={data.clicked} />
      <Section title="Productos más encontrados (clicks)" items={data.foundProducts} />
      <Section title="Términos que generan carrito" items={data.cartFromSearch} />
      <Section title="Términos que generan compra" items={data.purchaseFromSearch} />
      <div className="rounded-lg border bg-background md:col-span-2 lg:col-span-3">
        <div className="border-b p-3 font-medium">Buscados pero no comprados</div>
        <div className="flex flex-wrap gap-2 p-3">
          {data.searchedNotBought.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
          {data.searchedNotBought.map((q) => <span key={q} className="rounded-full bg-muted px-3 py-1 text-xs">{q}</span>)}
        </div>
      </div>
    </div>
  );
}
