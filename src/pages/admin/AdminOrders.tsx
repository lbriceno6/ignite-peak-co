import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["all", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => orders.filter((o) =>
    (status === "all" || o.status === status) &&
    (!q || (o.shipping_name ?? "").toLowerCase().includes(q.toLowerCase()) || o.order_code.toLowerCase().includes(q.toLowerCase())),
  ), [orders, status, q]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by customer or code…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Code</th><th className="p-3">Date</th><th className="p-3">Customer</th>
              <th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_code}</Link></td>
                <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-3">{o.shipping_name}</td>
                <td className="p-3"><Badge variant="secondary" className="capitalize">{o.status}</Badge></td>
                <td className="p-3 capitalize">{o.payment_method}</td>
                <td className="p-3 font-semibold">${Number(o.total).toFixed(2)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
