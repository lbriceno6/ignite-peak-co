import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Save, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { useOrderShipment } from "@/hooks/useOrderShipment";
import { SHIPMENT_BADGE_CLASS, SHIPMENT_LABEL, type ShipmentStatus } from "@/lib/shalomStatus";

const STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

type Carrier = { id: string; name: string; code: string | null; is_active: boolean };

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  const { shipment, reload: reloadShipment } = useOrderShipment(id);
  const [form, setForm] = useState({ carrier_code: "shalom", tracking_number: "", tracking_code: "", ose_id: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(o);
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(it ?? []);
    const { data: c } = await supabase.from("shipping_providers").select("id,name,code,is_active").eq("is_active", true).order("sort_order");
    setCarriers((c as Carrier[]) ?? []);
  };
  useEffect(() => { if (id) load(); }, [id]);

  useEffect(() => {
    if (shipment) {
      setForm({
        carrier_code: shipment.carrier_code || "shalom",
        tracking_number: shipment.tracking_number || "",
        tracking_code: shipment.tracking_code || "",
        ose_id: shipment.ose_id || "",
      });
    }
  }, [shipment?.id]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  const saveTracking = async () => {
    if (!id) return;
    setSaving(true);
    const carrier = carriers.find((c) => c.code === form.carrier_code);
    const payload = {
      order_id: id,
      carrier_id: carrier?.id ?? null,
      carrier_code: form.carrier_code,
      tracking_number: form.tracking_number || null,
      tracking_code: form.tracking_code || null,
      ose_id: form.ose_id || null,
      status_internal: shipment?.status_internal ?? "preparando",
    };
    const { error } = await (supabase as any).from("order_shipments").upsert(payload, { onConflict: "order_id" });
    setSaving(false);
    if (error) return toast.error("No se pudo guardar: " + error.message);
    toast.success("Tracking guardado");
    reloadShipment();
  };

  const refreshTracking = async () => {
    if (!id) return;
    setRefreshing(true);
    const { data, error } = await supabase.functions.invoke("shalom-tracking-query", {
      body: {
        order_id: id,
        tracking_number: form.tracking_number || null,
        tracking_code: form.tracking_code || null,
        ose_id: form.ose_id || null,
      },
    });
    setRefreshing(false);
    if (error) return toast.error("Error: " + error.message);
    if ((data as any)?.warning) toast.warning("Última consulta con aviso: " + (data as any).warning);
    else toast.success("Tracking actualizado");
    reloadShipment();
  };

  if (!order) return <div className="text-muted-foreground">Loading…</div>;

  const status = (shipment?.status_internal ?? "sin_tracking") as ShipmentStatus;

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

      {/* Gestión de envío */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de envío</CardTitle>
          <Badge className={SHIPMENT_BADGE_CLASS[status]} variant="secondary">{SHIPMENT_LABEL[status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Transportista</Label>
              <Select value={form.carrier_code} onValueChange={(v) => setForm({ ...form, carrier_code: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.code || c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número de orden / tracking</Label>
              <Input className="mt-1" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </div>
            <div>
              <Label>Código Shalom</Label>
              <Input className="mt-1" value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} />
            </div>
            <div>
              <Label>OSE ID</Label>
              <Input className="mt-1" value={form.ose_id} onChange={(e) => setForm({ ...form, ose_id: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveTracking} disabled={saving} variant="outline">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar tracking
            </Button>
            <Button onClick={refreshTracking} disabled={refreshing || (!form.tracking_number && !form.ose_id)}>
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar tracking ahora
            </Button>
            {form.tracking_number && (
              <Button asChild variant="ghost">
                <a href={`https://shalom.com.pe/tracking?numero=${encodeURIComponent(form.tracking_number)}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Ver en Shalom
                </a>
              </Button>
            )}
          </div>

          {shipment && (
            <div className="grid gap-3 md:grid-cols-2 text-sm pt-2 border-t">
              <Row label="Origen" value={shipment.origin_name ?? "—"} />
              <Row label="Destino" value={shipment.destination_name ?? "—"} />
              <Row label="Fecha registro" value={shipment.registered_at ? new Date(shipment.registered_at).toLocaleString() : "—"} />
              <Row label="Fecha entrega" value={shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString() : (shipment.estimated_delivery_at ? new Date(shipment.estimated_delivery_at).toLocaleString() : "—")} />
              <Row label="Último movimiento" value={shipment.last_event_title ?? "—"} />
              <Row label="Última consulta" value={shipment.last_checked_at ? new Date(shipment.last_checked_at).toLocaleString() : "—"} />
            </div>
          )}

          {shipment?.error_message && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Error interno de wrapper</p>
                <p className="font-mono break-all">{shipment.error_message}</p>
              </div>
            </div>
          )}

          {Array.isArray(shipment?.history_json) && shipment!.history_json.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Historial</p>
              <ol className="space-y-2">
                {shipment!.history_json.map((ev: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{ev.title || ev.description || "Movimiento"}</span>
                    <span className="text-muted-foreground"> · {[ev.date, ev.time, ev.location].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Row = ({ label, value, bold }: any) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-bold" : ""}>{value}</span></div>
);
