import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";

const EVENTS = ["view_item", "search", "select_item", "add_to_cart", "begin_checkout", "purchase", "whatsapp_click", "landing_page_view"];

export function EventsQaTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ event: "", product: "", days: 7 });

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - filter.days * 86400000).toISOString();
    let q = supabase.from("product_events" as any)
      .select("id, event_type, product_slug, product_id, user_id, session_id, metadata, value, created_at, landing_slug")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter.event) q = q.eq("event_type", filter.event);
    if (filter.product) q = q.ilike("product_slug", `%${filter.product}%`);
    const { data } = await q;
    setRows((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter.days, filter.event]);

  const counts = EVENTS.map((e) => ({ event: e, count: rows.filter((r) => r.event_type === e).length }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {counts.map((c) => (
          <div key={c.event} className="rounded-lg border bg-background p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{c.event}</div>
            <div className="font-display text-xl">{c.count}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Evento</label>
          <select className="block h-9 rounded-md border bg-background px-2 text-sm"
            value={filter.event} onChange={(e) => setFilter({ ...filter, event: e.target.value })}>
            <option value="">Todos</option>
            {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Producto (slug)</label>
          <Input value={filter.product} onChange={(e) => setFilter({ ...filter, product: e.target.value })} className="w-48" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Últimos días</label>
          <Input type="number" min={1} value={filter.days} onChange={(e) => setFilter({ ...filter, days: +e.target.value || 7 })} className="w-24" />
        </div>
        <Button variant="dark" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refrescar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Evento</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Landing</th>
              <th className="p-3">Sesión</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Payload</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{r.event_type}</Badge></td>
                <td className="p-3 text-xs">{r.product_slug ?? "—"}</td>
                <td className="p-3 text-xs">{r.landing_slug ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.session_id?.slice(0, 8) ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.user_id?.slice(0, 8) ?? "anon"}</td>
                <td className="p-3 text-xs">{r.value ?? "—"}</td>
                <td className="p-3 text-xs"><pre className="max-w-[280px] overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{JSON.stringify(r.metadata, null, 1)}</pre></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sin eventos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
