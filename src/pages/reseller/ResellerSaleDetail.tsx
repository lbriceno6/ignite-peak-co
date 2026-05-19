import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Tag, Wallet, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReseller } from "@/hooks/useReseller";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobada", paid: "Pagada", cancelled: "Cancelada",
};

const ResellerSaleDetail = () => {
  const { id } = useParams();
  const { reseller } = useReseller();
  const { format } = useCurrency();
  const [ref, setRef] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !reseller) return;
    (async () => {
      const { data: r } = await (supabase as any)
        .from("reseller_referrals").select("*").eq("id", id).eq("reseller_id", reseller.id).maybeSingle();
      setRef(r);
      if (r?.order_id) {
        const { data: o } = await supabase.from("orders").select("*").eq("id", r.order_id).maybeSingle();
        setOrder(o);
        const { data: oi } = await supabase.from("order_items").select("*").eq("order_id", r.order_id);
        setItems(oi ?? []);
      }
      setLoading(false);
    })();
  }, [id, reseller]);

  if (loading) return <div className="text-center text-muted-foreground py-10">Cargando…</div>;
  if (!ref) return <div className="text-center text-muted-foreground py-10">Referido no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/reseller/sales"><ArrowLeft size={14}/> Mis ventas</Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Referido #{String(ref.id).slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">{new Date(ref.created_at).toLocaleString()}</p>
        </div>
        <Badge variant={ref.status === "paid" ? "default" : "secondary"}>
          {STATUS_LABEL[ref.status] ?? ref.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subtotal atribuido" value={format(Number(ref.subtotal ?? 0))} />
        <Stat label={`Comisión (${ref.commission_percent}%)`} value={format(Number(ref.commission_amount ?? 0))} highlight />
        <Stat label="Fuente" value={ref.source === "code" ? "Código" : "Link"} />
      </div>

      {order && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Package size={14}/> Pedido del cliente</div>
          <div className="mt-1 font-mono text-sm">{order.order_code}</div>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <Row k="Subtotal pedido" v={format(Number(order.subtotal ?? 0))} />
            <Row k="Envío" v={Number(order.shipping) === 0 ? "Gratis" : format(Number(order.shipping ?? 0))} />
            {Number(order.reseller_discount_applied) > 0 && (
              <Row k={<span className="inline-flex items-center gap-1"><Tag size={12}/> Descuento revendedor</span>}
                   v={<span className="text-accent">−{format(Number(order.reseller_discount_applied))}</span>} />
            )}
            {Number(order.store_credit_used) > 0 && (
              <Row k={<span className="inline-flex items-center gap-1"><Wallet size={12}/> Saldo en tienda usado</span>}
                   v={<span className="text-accent">−{format(Number(order.store_credit_used))}</span>} />
            )}
            <Row k="Total" v={<span className="font-display text-lg">{format(Number(order.total ?? 0))}</span>} />
            <Row k="Estado del pedido" v={<Badge variant="outline">{order.status}</Badge>} />
          </dl>

          {items.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <div className="mb-2 text-xs uppercase text-muted-foreground">Productos</div>
              <ul className="space-y-2 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{it.product_name} <span className="text-muted-foreground">× {it.quantity}</span></span>
                    <span className="font-medium">{format(Number(it.unit_price) * it.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="text-xs uppercase text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display text-2xl ${highlight ? "text-accent" : ""}`}>{value}</div>
  </div>
);
const Row = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
    <dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd>
  </div>
);

export default ResellerSaleDetail;
