import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/orderStatus";

const FILTER_STATUSES = ["all", ...ORDER_STATUSES];
const FILTER_LABEL: Record<string, string> = { all: "Todos", ...ORDER_STATUS_LABEL };

const CARRIER_LABEL: Record<string, string> = {
  shalom: "Shalom",
  olva: "Olva Courier",
};

const carrierName = (code?: string | null) => {
  if (!code) return "—";
  return CARRIER_LABEL[code] || code.charAt(0).toUpperCase() + code.slice(1);
};

type ShipInfo = { carrier_code: string | null; tracking_number: string | null };

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, ShipInfo>>({});
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
          .select("order_id,carrier_code,tracking_number")
          .in("order_id", ids);
        const map: Record<string, ShipInfo> = {};
        (ships ?? []).forEach((s: any) => {
          map[s.order_id] = { carrier_code: s.carrier_code, tracking_number: s.tracking_number };
        });
        setShipments(map);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!term) return true;
      const tracking = shipments[o.id]?.tracking_number ?? "";
      return (
        (o.shipping_name ?? "").toLowerCase().includes(term) ||
        o.order_code.toLowerCase().includes(term) ||
        tracking.toLowerCase().includes(term)
      );
    });
  }, [orders, status, q, shipments]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Pedidos</h1>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por cliente, código o N° de orden…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTER_STATUSES.map((s) => <SelectItem key={s} value={s}>{FILTER_LABEL[s]}</SelectItem>)}
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
              <th className="p-3">N° de orden</th>
              <th className="p-3">Pago</th>
              <th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const sh = shipments[o.id];
              return (
                <tr key={o.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_code}</Link></td>
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{o.shipping_name}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={cn(ORDER_STATUS_CLASS[o.status])}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </td>
                  <td className="p-3">{carrierName(sh?.carrier_code)}</td>
                  <td className="p-3 font-mono text-xs">{sh?.tracking_number || "—"}</td>
                  <td className="p-3 capitalize">{o.payment_method}</td>
                  <td className="p-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sin pedidos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
