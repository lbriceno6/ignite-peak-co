import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Package, ShoppingBag, DollarSign, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierStatusTimeline } from "@/components/supplier/SupplierStatusTimeline";

const Stat = ({ icon: Icon, label, value, hint }: any) => (
  <div className="rounded-xl border bg-card p-5">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      <Icon size={14} /> {label}
    </div>
    <div className="mt-2 font-display text-3xl">{value}</div>
    {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  </div>
);

export default function SupplierDashboard() {
  const { supplierId } = useAuth();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    pending: 0,
    sales30: 0,
    commission30: 0,
    payout30: 0,
  });

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      setLoading(true);
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [{ count: products }, items, pending] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
        supabase.from("order_items")
          .select("unit_price,quantity,commission_amount,supplier_payout,created_at")
          .eq("supplier_id", supplierId)
          .gte("created_at", since.toISOString()),
        supabase.from("order_items")
          .select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId)
          .eq("fulfillment_status", "pending"),
      ]);
      const rows = (items.data ?? []) as any[];
      const sales = rows.reduce((s, r) => s + Number(r.unit_price) * Number(r.quantity), 0);
      const commission = rows.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
      const payout = rows.reduce((s, r) => s + Number(r.supplier_payout || 0), 0);
      setStats({
        products: products ?? 0,
        pending: pending.count ?? 0,
        sales30: sales,
        commission30: commission,
        payout30: payout,
      });
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="grid h-60 place-items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Panel</h1>
          <p className="text-sm text-muted-foreground">Resumen de los últimos 30 días.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/supplier/products/new">+ Nuevo producto</Link></Button>
          <Button asChild variant="dark" size="sm"><Link to="/supplier/orders">Ver pedidos</Link></Button>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-emerald-600">
          ● Cuenta aprobada
        </div>
        <p className="mt-1 text-muted-foreground">
          Tu tienda está activa. Si te rechazaran un producto, recibirás una notificación con el motivo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Package} label="Productos publicados" value={stats.products} />
        <Stat icon={ShoppingBag} label="Pedidos por enviar" value={stats.pending} />
        <Stat icon={DollarSign} label="Ventas (30 días)" value={format(stats.sales30)} />
        <Stat icon={Wallet} label="Tu neto (30 días)" value={format(stats.payout30)} hint={`Comisión: ${format(stats.commission30)}`} />
      </div>
    </div>
  );
}
