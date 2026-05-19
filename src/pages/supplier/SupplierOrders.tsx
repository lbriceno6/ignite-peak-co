import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Truck, Check } from "lucide-react";
import { format as dfmt } from "date-fns";

type Item = {
  id: string; order_id: string; created_at: string;
  product_name: string; variant: string | null; quantity: number;
  unit_price: number; commission_amount: number; supplier_payout: number;
  fulfillment_status: string; tracking_number: string | null;
  orders: { order_code: string; shipping_name: string | null; shipping_address: string | null; shipping_city: string | null; shipping_phone: string | null; status: string } | null;
};

const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado" };

export default function SupplierOrders() {
  const { supplierId } = useAuth();
  const { format } = useCurrency();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    const { data } = await supabase
      .from("order_items")
      .select("id,order_id,created_at,product_name,variant,quantity,unit_price,commission_amount,supplier_payout,fulfillment_status,tracking_number,orders(order_code,shipping_name,shipping_address,shipping_city,shipping_phone,status)")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    setRows((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [supplierId]);

  const updateItem = async (id: string, patch: { fulfillment_status?: string; tracking_number?: string | null }) => {
    const { error } = await supabase.from("order_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizado");
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.fulfillment_status === filter);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Items vendidos de tu catálogo.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="shipped">Enviados</SelectItem>
            <SelectItem value="delivered">Entregados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid h-60 place-items-center"><Loader2 className="animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">No hay pedidos.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.orders?.order_code}</span>
                    <Badge variant={r.fulfillment_status === "delivered" ? "default" : r.fulfillment_status === "shipped" ? "secondary" : "outline"}>
                      {STATUS_LABEL[r.fulfillment_status] ?? r.fulfillment_status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{dfmt(new Date(r.created_at), "dd MMM yyyy")}</span>
                  </div>
                  <div className="mt-1 font-semibold">{r.product_name}{r.variant ? ` · ${r.variant}` : ""}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.quantity} × {format(Number(r.unit_price))} ·
                    Comisión: {format(Number(r.commission_amount))} ·
                    <strong className="text-foreground"> Neto: {format(Number(r.supplier_payout))}</strong>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold">{r.orders?.shipping_name}</div>
                  <div className="text-muted-foreground">{r.orders?.shipping_phone}</div>
                  <div className="text-muted-foreground">{r.orders?.shipping_address}, {r.orders?.shipping_city}</div>
                </div>
              </div>

              {r.fulfillment_status !== "delivered" && r.fulfillment_status !== "cancelled" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <Input
                    className="h-9 max-w-xs"
                    placeholder="Número de seguimiento (opcional)"
                    defaultValue={r.tracking_number ?? ""}
                    onChange={(e) => setTracking((t) => ({ ...t, [r.id]: e.target.value }))}
                  />
                  {r.fulfillment_status === "pending" && (
                    <Button size="sm" variant="dark" onClick={() => updateItem(r.id, { fulfillment_status: "shipped", tracking_number: tracking[r.id] ?? r.tracking_number ?? null })}>
                      <Truck size={14}/> Marcar enviado
                    </Button>
                  )}
                  {r.fulfillment_status === "shipped" && (
                    <Button size="sm" variant="outline" onClick={() => updateItem(r.id, { fulfillment_status: "delivered" })}>
                      <Check size={14}/> Marcar entregado
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
