import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pause, Play, X, Repeat, Calendar, Package } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptionSettings } from "@/hooks/useSubscriptionSettings";

type Sub = {
  id: string;
  product_name: string;
  product_image: string | null;
  product_slug: string;
  variant: string | null;
  unit_price: number;
  quantity: number;
  interval_days: number;
  discount_percent: number;
  status: "active" | "paused" | "cancelled";
  next_delivery_at: string;
  created_at: string;
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "bg-success/15 text-success" },
  paused: { label: "Pausada", cls: "bg-amber-500/15 text-amber-600" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
};

const MySubscriptions = () => {
  const { user } = useAuth();
  const { format } = useCurrency();
  const sub = useSubscriptionSettings();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("subscriptions").select("*").order("created_at", { ascending: false });
    setSubs((data ?? []) as Sub[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const update = async (id: string, patch: Partial<Sub>) => {
    const { error } = await (supabase as any).from("subscriptions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Suscripción actualizada");
    load();
  };

  const pause = (s: Sub) => update(s.id, { status: "paused" });
  const resume = (s: Sub) => {
    const next = new Date(); next.setDate(next.getDate() + s.interval_days);
    update(s.id, { status: "active", next_delivery_at: next.toISOString() });
  };
  const cancel = (s: Sub) => {
    if (!confirm("¿Cancelar esta suscripción? No se generarán más cobros ni envíos.")) return;
    update(s.id, { status: "cancelled" });
  };
  const changeInterval = (s: Sub, days: number) => {
    const next = new Date(); next.setDate(next.getDate() + days);
    update(s.id, { interval_days: days, next_delivery_at: next.toISOString() });
  };

  return (
    <Layout>
      <div className="container-x py-12 max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="font-display text-4xl uppercase flex items-center gap-3">
            <Repeat className="text-accent" size={32}/> Mis suscripciones
          </h1>
          <Button asChild variant="outline" size="sm"><Link to="/my-profile">Mi cuenta</Link></Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : subs.length === 0 ? (
          <div className="rounded-lg border p-10 text-center">
            <Package className="mx-auto mb-3 text-muted-foreground" size={40}/>
            <p className="text-lg font-medium">No tienes suscripciones activas</p>
            <p className="mt-2 text-sm text-muted-foreground">Activa “{sub.label}” en cualquier producto para recibirlo automáticamente.</p>
            <Button asChild className="mt-4"><Link to="/">Ver productos</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((s) => {
              const meta = statusMeta[s.status];
              const intervalOptions = Array.from(new Set([...sub.defaultIntervals, s.interval_days])).sort((a,b)=>a-b);
              const total = Number(s.unit_price) * s.quantity;
              return (
                <div key={s.id} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start gap-4">
                    {s.product_image && (
                      <img src={s.product_image} alt={s.product_name} className="h-20 w-20 rounded bg-secondary object-cover"/>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/product/${s.product_slug}`} className="font-display text-lg hover:underline">{s.product_name}</Link>
                        <Badge className={meta.cls} variant="secondary">{meta.label}</Badge>
                      </div>
                      {s.variant && <p className="text-xs text-muted-foreground">{s.variant}</p>}
                      <p className="mt-1 text-sm">
                        {s.quantity} × {format(Number(s.unit_price))} ·
                        <span className="ml-1 font-semibold">{format(total)}</span>
                        <span className="ml-1 text-xs text-muted-foreground">/ envío (−{Number(s.discount_percent)}%)</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Frecuencia</label>
                      <Select
                        disabled={s.status === "cancelled"}
                        value={String(s.interval_days)}
                        onValueChange={(v) => changeInterval(s, Number(v))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {intervalOptions.map((d) => (
                            <SelectItem key={d} value={String(d)}>Cada {d} días</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Próxima entrega</label>
                      <div className="mt-1 flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm">
                        <Calendar size={14} className="text-muted-foreground"/>
                        {s.status === "cancelled" ? "—" : new Date(s.next_delivery_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  </div>

                  {s.status !== "cancelled" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {s.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => pause(s)}><Pause size={14}/> Pausar</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => resume(s)}><Play size={14}/> Reanudar</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => cancel(s)}>
                        <X size={14}/> Cancelar suscripción
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MySubscriptions;
