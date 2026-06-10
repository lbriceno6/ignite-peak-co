import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useOrderShipmentsMap } from "@/hooks/useOrderShipment";
import { SHIPMENT_BADGE_CLASS, SHIPMENT_LABEL, type ShipmentStatus } from "@/lib/shalomStatus";

type Order = {
  id: string;
  order_code: string;
  status: string;
  total: number;
  payment_method: string;
  created_at: string;
};

const statusVariant: Record<string, string> = {
  pending: "bg-muted text-foreground",
  confirmed: "bg-blue-500/15 text-blue-600",
  preparing: "bg-amber-500/15 text-amber-600",
  shipped: "bg-purple-500/15 text-purple-600",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const statusLabel: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmado", preparing: "En preparación",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
};

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    });
  }, [user]);

  const ids = useMemo(() => orders.map((o) => o.id), [orders]);
  const { map: shipMap } = useOrderShipmentsMap(ids);

  return (
    <Layout>
      <div className="container-x py-12">
        <h1 className="font-display text-4xl uppercase mb-8">Mis pedidos</h1>

        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-border p-10 text-center">
            <p className="text-lg font-medium">Aún no tienes pedidos</p>
            <p className="mt-2 text-sm text-muted-foreground">Empieza a potenciar tu entrenamiento.</p>
            <Button asChild className="mt-4"><Link to="/">Comprar ahora</Link></Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Envío</th>
                  <th className="px-4 py-3 text-left">Pago</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const sh = shipMap[o.id];
                  const sStatus = (sh?.status_internal ?? "sin_tracking") as ShipmentStatus;
                  return (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{o.order_code}</td>
                      <td className="px-4 py-3">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusVariant[o.status] ?? ""} variant="secondary">{statusLabel[o.status] ?? o.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={SHIPMENT_BADGE_CLASS[sStatus]} variant="secondary">{SHIPMENT_LABEL[sStatus]}</Badge>
                        {sh?.last_checked_at && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(sh.last_checked_at).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{o.payment_method}</td>
                      <td className="px-4 py-3 text-right font-semibold">{format(Number(o.total))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline"><Link to={`/my-orders/${o.id}`}>Ver detalles</Link></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyOrders;
