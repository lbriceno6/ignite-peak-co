import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Wallet, Trophy, Tag, Copy, Check } from "lucide-react";
import { useReseller, ResellerTier } from "@/hooks/useReseller";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";

const ResellerDashboard = () => {
  const { reseller, tier, loading } = useReseller();
  const { format } = useCurrency();
  const [tiers, setTiers] = useState<ResellerTier[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("reseller_tiers").select("*").eq("is_active", true).order("sort_order");
      setTiers(data ?? []);
    })();
  }, []);

  if (loading || !reseller) return <div className="text-muted-foreground">Cargando…</div>;

  const nextTier = tiers.find((t) => t.min_sales > reseller.total_sales);
  const progress = nextTier ? Math.min(100, (reseller.total_sales / nextTier.min_sales) * 100) : 100;
  const link = `${window.location.origin}/?ref=${reseller.link_slug}`;

  const copy = (v: string) => { navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Hola revendedor 👋</h1>
        <p className="text-sm text-muted-foreground">Estás en el nivel <span className="font-semibold text-foreground">{tier?.name ?? "—"}</span> con comisión del <span className="font-semibold text-foreground">{tier?.commission_percent ?? 0}%</span>.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Trophy} label="Nivel actual" value={tier?.name ?? "Bronce"} sub={`${tier?.commission_percent ?? 0}% comisión`} />
        <Stat icon={TrendingUp} label="Ventas acumuladas" value={format(reseller.total_sales)} sub={`Comisión total ${format(reseller.total_commission)}`} />
        <Stat icon={Wallet} label="Balance efectivo" value={format(reseller.balance_cash)} sub="A solicitar pago" />
        <Stat icon={Tag} label="Saldo en tienda" value={format(reseller.balance_credit)} sub="Úsalo en tus compras" />
      </div>

      {nextTier && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl uppercase">Próximo nivel: {nextTier.name}</h3>
            <span className="text-sm text-muted-foreground">{format(reseller.total_sales)} / {format(nextTier.min_sales)}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Sube a {nextTier.name} para ganar {nextTier.commission_percent}% por venta.</p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-display text-xl uppercase">Comparte y gana</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Tu código</p>
            <div className="mt-1 flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <span className="flex-1 font-mono text-lg font-bold tracking-widest">{reseller.code}</span>
              <button onClick={() => copy(reseller.code)} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Tu link</p>
            <div className="mt-1 flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <span className="flex-1 truncate text-sm">{link}</span>
              <button onClick={() => copy(link)} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
        <Button asChild variant="accent" className="mt-4"><Link to="/reseller/link">Ver más opciones de compartir</Link></Button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-display text-xl uppercase">Tabla de niveles</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Nivel</th><th>Desde</th><th>Comisión</th><th>Descuento al cliente</th></tr></thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${t.id === reseller.tier_id ? "bg-accent/5 font-semibold" : ""}`}>
                  <td className="py-2">{t.name}{t.id === reseller.tier_id && " ★"}</td>
                  <td>{format(t.min_sales)}</td>
                  <td>{t.commission_percent}%</td>
                  <td>{t.customer_discount_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border bg-card p-5">
    <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Icon size={14} /> {label}</div>
    <div className="mt-2 font-display text-2xl">{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export default ResellerDashboard;
