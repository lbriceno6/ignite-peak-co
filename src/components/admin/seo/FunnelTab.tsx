import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type EvRow = {
  event_type: string;
  product_slug: string | null;
  landing_slug: string | null;
  session_id: string | null;
  value: number | null;
  created_at: string;
};

const STAGES: { key: string; label: string }[] = [
  { key: "view_item", label: "Vista de producto" },
  { key: "add_to_cart", label: "Añadido al carrito" },
  { key: "begin_checkout", label: "Inicio de checkout" },
  { key: "purchase", label: "Compra" },
];

const ALL = "__all__";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function FunnelTab() {
  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(isoDay(monthAgo));
  const [to, setTo] = useState(isoDay(today));
  const [productSlug, setProductSlug] = useState<string>(ALL);
  const [landingSlug, setLandingSlug] = useState<string>(ALL);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EvRow[]>([]);
  const [productOpts, setProductOpts] = useState<string[]>([]);
  const [landingOpts, setLandingOpts] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    let q = supabase
      .from("product_events" as any)
      .select("event_type, product_slug, landing_slug, session_id, value, created_at")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .in("event_type", STAGES.map((s) => s.key))
      .limit(50000);
    if (productSlug !== ALL) q = q.eq("product_slug", productSlug);
    if (landingSlug !== ALL) q = q.eq("landing_slug", landingSlug);
    const { data } = await q;
    setRows(((data ?? []) as unknown) as EvRow[]);
    setLoading(false);
  };

  // Initial: load filter option lists from a wider window (90 days)
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("product_events" as any)
        .select("product_slug, landing_slug")
        .gte("created_at", since)
        .limit(20000);
      const ps = new Set<string>();
      const ls = new Set<string>();
      ((data ?? []) as any[]).forEach((r) => {
        if (r.product_slug) ps.add(r.product_slug);
        if (r.landing_slug) ls.add(r.landing_slug);
      });
      setProductOpts(Array.from(ps).sort());
      setLandingOpts(Array.from(ls).sort());
    })();
  }, []);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const funnel = useMemo(() => {
    const sessionsByStage = new Map<string, Set<string>>();
    const valueByStage = new Map<string, number>();
    STAGES.forEach((s) => { sessionsByStage.set(s.key, new Set()); valueByStage.set(s.key, 0); });
    rows.forEach((e) => {
      const sid = e.session_id || `noid:${e.created_at}`;
      sessionsByStage.get(e.event_type)?.add(sid);
      if (typeof e.value === "number") valueByStage.set(e.event_type, (valueByStage.get(e.event_type) ?? 0) + e.value);
    });
    const baseline = sessionsByStage.get(STAGES[0].key)?.size ?? 0;
    return STAGES.map((s, i) => {
      const count = sessionsByStage.get(s.key)?.size ?? 0;
      const prev = i === 0 ? count : (sessionsByStage.get(STAGES[i - 1].key)?.size ?? 0);
      const rateFromPrev = prev > 0 ? (count / prev) * 100 : 0;
      const rateFromTop = baseline > 0 ? (count / baseline) * 100 : 0;
      const value = valueByStage.get(s.key) ?? 0;
      return { ...s, count, rateFromPrev, rateFromTop, value };
    });
  }, [rows]);

  const totalValue = funnel.find((f) => f.key === "purchase")?.value ?? 0;
  const purchases = funnel.find((f) => f.key === "purchase")?.count ?? 0;
  const aov = purchases > 0 ? totalValue / purchases : 0;
  const maxBar = funnel[0]?.count || 1;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter size={14} /> Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Producto</Label>
            <Select value={productSlug} onValueChange={setProductSlug}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {productOpts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Landing</Label>
            <Select value={landingSlug} onValueChange={setLandingSlug}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {landingOpts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="dark" onClick={load} disabled={loading} className="w-full">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null} Aplicar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Sesiones (top)" value={funnel[0]?.count ?? 0} />
        <Stat label="Compras" value={purchases} />
        <Stat label="Ticket promedio" value={aov.toLocaleString("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 })} />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="mb-3 text-sm font-semibold">Embudo de conversión</div>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const widthPct = maxBar > 0 ? Math.max(4, (f.count / maxBar) * 100) : 4;
            return (
              <div key={f.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{i + 1}. {f.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{f.key}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{f.count.toLocaleString()} sesiones</span>
                    {i > 0 && <span className="text-muted-foreground">↓ {f.rateFromPrev.toFixed(1)}% del paso previo</span>}
                    <span className="text-muted-foreground">({f.rateFromTop.toFixed(1)}% del top)</span>
                  </div>
                </div>
                <div className="h-7 w-full overflow-hidden rounded bg-muted/50">
                  <div
                    className="h-full rounded bg-foreground/80 transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {rows.length === 0 && !loading && (
          <p className="mt-4 text-sm text-muted-foreground">Sin eventos para el rango y filtros seleccionados.</p>
        )}
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b p-3 text-sm font-semibold">Detalle por etapa</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Etapa</th>
              <th className="p-3">Sesiones únicas</th>
              <th className="p-3">% desde top</th>
              <th className="p-3">% desde paso previo</th>
              <th className="p-3">Valor (PEN)</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((f, i) => (
              <tr key={f.key} className="border-t">
                <td className="p-3 font-medium">{f.label}</td>
                <td className="p-3">{f.count.toLocaleString()}</td>
                <td className="p-3">{f.rateFromTop.toFixed(2)}%</td>
                <td className="p-3">{i === 0 ? "—" : `${f.rateFromPrev.toFixed(2)}%`}</td>
                <td className="p-3">{f.value > 0 ? f.value.toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 font-display text-2xl">{value}</div>
  </div>
);
