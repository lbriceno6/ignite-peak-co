import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUSES = ["all", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

const STATUS_LABEL: Record<string, string> = {
  all: "Todos",
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

const CARRIER_LABEL: Record<string, string> = {
  shalom: "Shalom",
  olva: "Olva Courier",
};

const carrierName = (code?: string | null) => {
  if (!code) return "—";
  return CARRIER_LABEL[code] || code.charAt(0).toUpperCase() + code.slice(1);
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data ?? []);
      const ids = (data ?? []).map((o: any) => o.id);
      if (ids.length) {
        const { data: ships } = await (supabase as any)
          .from("order_shipments")
          .select("order_id,carrier_code")
          .in("order_id", ids);
        const map: Record<string, string> = {};
        (ships ?? []).forEach((s: any) => { map[s.order_id] = s.carrier_code; });
        setShipments(map);
      }
    })();
  }, []);

  const filtered = useMemo(() => orders.filter((o) =>
    (status === "all" || o.status === status) &&
    (!q || (o.shipping_name ?? "").toLowerCase().includes(q.toLowerCase()) || o.order_code.toLowerCase().includes(q.toLowerCase())),
  ), [orders, status, q]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Pedidos</h1>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por cliente o código…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Transportista</th>
              <th className="p-3">Pago</th>
              <th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_code}</Link></td>
                <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-3">{o.shipping_name}</td>
                <td className="p-3">
                  <Badge variant="outline" className={cn("border", STATUS_CLASS[o.status])}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                </td>
                <td className="p-3">{carrierName(shipments[o.id])}</td>
                <td className="p-3 capitalize">{o.payment_method}</td>
                <td className="p-3 font-semibold">${Number(o.total).toFixed(2)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin pedidos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
