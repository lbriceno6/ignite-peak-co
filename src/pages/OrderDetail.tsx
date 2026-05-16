import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";

type Order = any;
type Item = { id: string; product_name: string; product_image: string | null; variant: string | null; quantity: number; unit_price: number };

const statusLabel: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "In preparation",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

const OrderDetail = () => {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder(o);
      setItems((it ?? []) as Item[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Layout><div className="container-x py-20 text-center text-muted-foreground">Loading…</div></Layout>;
  if (!order) return <Layout><div className="container-x py-20 text-center">Order not found. <Link to="/my-orders" className="text-accent">Back</Link></div></Layout>;

  return (
    <Layout>
      <div className="container-x py-12 max-w-4xl">
        <Link to="/my-orders" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">← All orders</Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl uppercase">Order {order.order_code}</h1>
          <Badge variant="secondary">{statusLabel[order.status] ?? order.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>

        <div className="grid gap-6 mt-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-5 py-3 font-display uppercase">Products</div>
            <ul>
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                  {it.product_image && <img src={it.product_image} alt={it.product_name} className="h-16 w-16 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium">{it.product_name}</p>
                    {it.variant && <p className="text-xs text-muted-foreground">{it.variant}</p>}
                    <p className="text-xs text-muted-foreground">Qty: {it.quantity}</p>
                  </div>
                  <p className="font-semibold">€{(it.unit_price * it.quantity).toFixed(2)}</p>
                </li>
              ))}
              {items.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">No items</li>}
            </ul>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border p-5">
              <h3 className="font-display uppercase mb-3">Summary</h3>
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>€{Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span>Shipping</span><span>€{Number(order.shipping).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold mt-3 pt-3 border-t border-border"><span>Total</span><span>€{Number(order.total).toFixed(2)}</span></div>
              <p className="mt-3 text-xs text-muted-foreground capitalize">Payment: {order.payment_method}</p>
            </div>
            <div className="rounded-lg border border-border p-5 text-sm">
              <h3 className="font-display uppercase mb-3">Shipping</h3>
              <p>{order.shipping_name}</p>
              <p>{order.shipping_address}</p>
              <p>{order.shipping_postal_code} {order.shipping_city}</p>
              <p>{order.shipping_country}</p>
              <p className="mt-2 text-muted-foreground">{order.shipping_phone}</p>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;
