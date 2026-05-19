import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const KEYS = [
  "pay.yape.enabled", "pay.yape.holder", "pay.yape.phone", "pay.yape.qr_url", "pay.yape.note",
  "pay.plin.enabled", "pay.plin.holder", "pay.plin.phone", "pay.plin.qr_url", "pay.plin.note",
  "pay.bank.enabled", "pay.bank.bank_name", "pay.bank.account_type", "pay.bank.account_number",
  "pay.bank.cci", "pay.bank.holder", "pay.bank.document", "pay.bank.note",
  "pay.card.enabled",
  "pay.cod.enabled", "pay.cod.note",
  "pay.confirm_whatsapp",
] as const;

const sb: any = supabase;

export default function AdminPayments() {
  const [m, setM] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await sb.from("site_content").select("key,value").in("key", KEYS as unknown as string[]);
    const next: Record<string, string> = {};
    KEYS.forEach((k) => (next[k] = ""));
    (data ?? []).forEach((r: any) => { next[r.key] = r.value ?? ""; });
    setM(next); setSaved(next);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setM((p) => ({ ...p, [k]: v }));
  const dirty = KEYS.some((k) => (m[k] ?? "") !== (saved[k] ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({ key: k, value: m[k] ?? "" }));
      const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Métodos de pago guardados");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={(m[k] ?? "") === "1"} onCheckedChange={(v) => set(k, v ? "1" : "0")} />
    </div>
  );

  const F = ({ k, label, area, placeholder }: { k: string; label: string; area?: boolean; placeholder?: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      {area ? (
        <Textarea className="mt-1.5" rows={3} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
      ) : (
        <Input className="mt-1.5" value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Yape</h2>
        <Toggle k="pay.yape.enabled" label="Habilitar Yape" />
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="pay.yape.holder" label="Titular" placeholder="Nombre del titular" />
          <F k="pay.yape.phone" label="Número de celular" placeholder="9XX XXX XXX" />
          <F k="pay.yape.qr_url" label="URL del QR (opcional)" placeholder="https://..." />
        </div>
        <F k="pay.yape.note" label="Instrucciones para el cliente" area placeholder="Envía el comprobante por WhatsApp para confirmar tu pedido." />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Plin</h2>
        <Toggle k="pay.plin.enabled" label="Habilitar Plin" />
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="pay.plin.holder" label="Titular" />
          <F k="pay.plin.phone" label="Número de celular" placeholder="9XX XXX XXX" />
          <F k="pay.plin.qr_url" label="URL del QR (opcional)" />
        </div>
        <F k="pay.plin.note" label="Instrucciones para el cliente" area />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Transferencia / Depósito bancario</h2>
        <Toggle k="pay.bank.enabled" label="Habilitar transferencia / depósito" />
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="pay.bank.bank_name" label="Banco" placeholder="BCP / Interbank / BBVA…" />
          <F k="pay.bank.account_type" label="Tipo de cuenta" placeholder="Ahorros / Corriente — Soles" />
          <F k="pay.bank.account_number" label="Número de cuenta" />
          <F k="pay.bank.cci" label="CCI (cuenta interbancaria)" />
          <F k="pay.bank.holder" label="Titular" />
          <F k="pay.bank.document" label="DNI / RUC del titular" />
        </div>
        <F k="pay.bank.note" label="Instrucciones para el cliente" area placeholder="Envía el comprobante por WhatsApp para confirmar tu pedido." />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Otros</h2>
        <Toggle k="pay.card.enabled" label="Habilitar pago con tarjeta" />
        <Toggle k="pay.cod.enabled" label="Habilitar pago contra entrega" />
        <F k="pay.cod.note" label="Nota de pago contra entrega" area />
        <F k="pay.confirm_whatsapp" label="WhatsApp para confirmar el pago" placeholder="51999999999 (sin + ni espacios)" />
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={!dirty || saving} size="lg">{saving ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}
