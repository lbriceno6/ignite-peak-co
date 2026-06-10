import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { CART_STATUS_BADGE, CART_STATUS_LABEL, waLink } from "@/lib/crm";

export default function CrmAbandonedCarts() {
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("crm_abandoned_carts_v")
      .select("*")
      .order("last_activity", { ascending: false });
    setRows((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (user_id: string, status: string) => {
    const patch: any = { user_id, status, updated_at: new Date().toISOString() };
    if (status === "contactado") patch.contacted_at = new Date().toISOString();
    const { error } = await (supabase as any).from("crm_abandoned_cart_status").upsert(patch);
    if (error) return toast.error(error.message);
    toast.success("Estado actualizado");
    load();
  };

  const sendWa = async (r: any) => {
    const itemsTxt = (r.items_json || []).slice(0, 3).map((i: any) => `${i.name} x${i.quantity}`).join(", ");
    const msg = `Hola ${r.full_name || ""} 👋, vimos que dejaste en tu carrito: ${itemsTxt}. ¿Te ayudamos a completar tu pedido?`;
    const url = waLink(r.phone, msg);
    if (!url) return toast.error("Cliente sin teléfono");
    await (supabase as any).from("crm_whatsapp_log").insert({
      user_id: r.user_id, phone: r.phone, body: msg, status: "sent",
    });
    await updateStatus(r.user_id, "contactado");
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Carritos abandonados</h1>
        <p className="text-sm text-muted-foreground">Carritos sin actividad por más de 2 horas y sin pedido posterior.</p>
      </div>

      <Card><CardContent className="p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left"><tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Productos</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Última actividad</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b">
                    <td className="px-3 py-2"><Link to={`/admin/crm/clientes/${r.user_id}`} className="font-medium hover:underline">{r.full_name || "(sin nombre)"}</Link></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground"><div>{r.email}</div><div>{r.phone}</div></td>
                    <td className="px-3 py-2 text-xs">{(r.items_json || []).map((i: any) => `${i.name} x${i.quantity}`).join(", ")}</td>
                    <td className="px-3 py-2 text-right font-semibold">{format(Number(r.monto || 0))}</td>
                    <td className="px-3 py-2 text-xs">{new Date(r.last_activity).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${CART_STATUS_BADGE[r.status] || ""}`}>{CART_STATUS_LABEL[r.status] || r.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => sendWa(r)} disabled={!r.phone}>
                          <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                        </Button>
                        <Select value={r.status} onValueChange={(v) => updateStatus(r.user_id, v)}>
                          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(CART_STATUS_LABEL).map((s) => <SelectItem key={s} value={s}>{CART_STATUS_LABEL[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin carritos abandonados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
