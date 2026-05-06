import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(o);
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(it ?? []);
  };
  useEffect(() => { if (id) load(); }, [id]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  if (!order) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Back to orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{order.order_code}</h1>
          <p className="text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="w-48">
          <Select value={order.status} onValueChange={updateStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-4 border-b pb-3 last:border-0">
                {i.product_image && <img src={i.product_image} alt="" className="h-16 w-16 rounded object-cover" />}
                <div className="flex-1">
                  <div className="font-medium">{i.product_name}</div>
                  {i.variant && <div className="text-xs text-muted-foreground">{i.variant}</div>}
                </div>
                <div className="text-sm text-muted-foreground">x{i.quantity}</div>
                <div className="font-semibold">${(Number(i.unit_price) * i.quantity).toFixed(2)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={`$${Number(order.subtotal).toFixed(2)}`} />
              <Row label="Shipping" value={`$${Number(order.shipping).toFixed(2)}`} />
              <Row label="Total" value={`$${Number(order.total).toFixed(2)}`} bold />
              <Row label="Payment" value={order.payment_method} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>{order.shipping_name}</div>
              <div className="text-muted-foreground">{order.shipping_address}</div>
              <div className="text-muted-foreground">{order.shipping_city}, {order.shipping_postal_code}</div>
              <div className="text-muted-foreground">{order.shipping_country}</div>
              <div className="text-muted-foreground">{order.shipping_phone}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, bold }: any) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-bold" : ""}>{value}</span></div>
);
