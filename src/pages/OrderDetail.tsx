import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { XCircle, Loader2 } from "lucide-react";
import { AiPostPurchaseInsights } from "@/components/order/AiPostPurchaseInsights";

type Order = any;
type Item = { id: string; product_slug: string; product_name: string; product_image: string | null; variant: string | null; quantity: number; unit_price: number };

const statusLabel: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmado", preparing: "En preparación",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
};

const CANCELLABLE = new Set(["pending", "confirmed"]);

const OrderDetail = () => {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { format } = useCurrency();

  const [resellerCode, setResellerCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder(o);
      setItems((it ?? []) as Item[]);
      if (o?.reseller_id) {
        const { data: r } = await (supabase as any).from("resellers").select("code").eq("id", o.reseller_id).maybeSingle();
        setResellerCode(r?.code ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    setCancelling(false);
    if (error) { toast.error("No se pudo cancelar: " + error.message); return; }
    toast.success("Pedido cancelado");
    setOrder({ ...order, status: "cancelled" });
  };

  if (loading) return <Layout><div className="container-x py-20 text-center text-muted-foreground">Cargando…</div></Layout>;
  if (!order) return <Layout><div className="container-x py-20 text-center">Pedido no encontrado. <Link to="/my-orders" className="text-accent">Volver</Link></div></Layout>;

  const canCancel = CANCELLABLE.has(order.status);

  return (
    <Layout>
      <div className="container-x py-12 max-w-4xl">
        <Link to="/my-orders" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">← Todos los pedidos</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl uppercase">Pedido {order.order_code}</h1>
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{statusLabel[order.status] ?? order.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Realizado el {new Date(order.created_at).toLocaleString()}</p>

        <div className="mt-6">
          <AiPostPurchaseInsights
            orderCode={order.order_code}
            items={items.map((it) => ({
              product_slug: (it as any).product_slug ?? "",
              product_name: it.product_name,
              product_image: it.product_image,
              quantity: it.quantity,
            }))}
          />
        </div>

        <div className="grid gap-6 mt-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-5 py-3 font-display uppercase">Productos</div>
            <ul>
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                  {it.product_image && <img src={it.product_image} alt={it.product_name} className="h-16 w-16 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium">{it.product_name}</p>
                    {it.variant && <p className="text-xs text-muted-foreground">{it.variant}</p>}
                    <p className="text-xs text-muted-foreground">Cant: {it.quantity}</p>
                  </div>
                  <p className="font-semibold">{format(it.unit_price * it.quantity)}</p>
                </li>
              ))}
              {items.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">Sin artículos</li>}
            </ul>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border p-5">
              <h3 className="font-display uppercase mb-3">Resumen</h3>
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{format(Number(order.subtotal))}</span></div>
              {Number(order.reseller_discount_applied) > 0 && (
                <div className="flex justify-between text-sm mt-1 text-accent">
                  <span>Descuento revendedor{resellerCode ? ` (${resellerCode})` : ""}</span>
                  <span>−{format(Number(order.reseller_discount_applied))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-1"><span>Envío</span><span>{Number(order.shipping) === 0 ? "Gratis" : format(Number(order.shipping))}</span></div>
              {Number(order.store_credit_used) > 0 && (
                <div className="flex justify-between text-sm mt-1 text-accent">
                  <span>Saldo en tienda usado</span>
                  <span>−{format(Number(order.store_credit_used))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-3 pt-3 border-t border-border"><span>Total</span><span>{format(Number(order.total))}</span></div>
              <p className="mt-3 text-xs text-muted-foreground capitalize">Pago: {order.payment_method}</p>
              {order.reseller_id && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Atribuido a revendedor{resellerCode ? `: ${resellerCode}` : ""} · {order.referral_source === "code" ? "Código" : "Link"}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border p-5 text-sm">
              <h3 className="font-display uppercase mb-3">Envío</h3>
              <p>{order.shipping_name}</p>
              <p>{order.shipping_address}</p>
              <p>{order.shipping_postal_code} {order.shipping_city}</p>
              <p>{order.shipping_country}</p>
              <p className="mt-2 text-muted-foreground">{order.shipping_phone}</p>
            </div>

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive" disabled={cancelling}>
                    {cancelling ? <><Loader2 size={14} className="animate-spin" /> Cancelando…</> : <><XCircle size={14} /> Cancelar pedido</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El pedido {order.order_code} quedará marcado como cancelado y ya no será procesado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, cancelar pedido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {!canCancel && order.status !== "cancelled" && (
              <p className="text-xs text-muted-foreground text-center">Este pedido ya no puede cancelarse desde aquí. Contáctanos para asistencia.</p>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;
