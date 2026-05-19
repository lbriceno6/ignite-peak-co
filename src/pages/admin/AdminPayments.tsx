import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowUp, ArrowDown, Smartphone, Landmark, Banknote, CreditCard } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { id: "yape", label: "Yape", icon: Smartphone },
  { id: "plin", label: "Plin", icon: Smartphone },
  { id: "bank", label: "Transferencia / Depósito bancario", icon: Landmark },
  { id: "cod", label: "Pago contra entrega", icon: Banknote },
  { id: "card", label: "Tarjeta", icon: CreditCard },
] as const;
type MethodId = typeof METHODS[number]["id"];
const DEFAULT_ORDER: MethodId[] = METHODS.map((m) => m.id);

const KEYS = [
  "pay.order",
  "pay.yape.enabled", "pay.yape.holder", "pay.yape.phone", "pay.yape.qr_url", "pay.yape.note",
  "pay.plin.enabled", "pay.plin.holder", "pay.plin.phone", "pay.plin.qr_url", "pay.plin.note",
  "pay.bank.enabled", "pay.bank.bank_name", "pay.bank.account_type", "pay.bank.account_number",
  "pay.bank.cci", "pay.bank.holder", "pay.bank.document", "pay.bank.note",
  "pay.card.enabled",
  "pay.cod.enabled", "pay.cod.note",
  "pay.confirm_whatsapp",
] as const;

const sb: any = supabase;

const parseOrder = (raw: string): MethodId[] => {
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean) as MethodId[];
  const valid = ids.filter((i) => DEFAULT_ORDER.includes(i));
  DEFAULT_ORDER.forEach((i) => { if (!valid.includes(i)) valid.push(i); });
  return valid;
};

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

  const order = useMemo(() => parseOrder(m["pay.order"] ?? ""), [m]);
  const move = (id: MethodId, dir: -1 | 1) => {
    const arr = [...order];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("pay.order", arr.join(","));
  };

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
        <Textarea key={k} className="mt-1.5" rows={3} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
      ) : (
        <Input key={k} className="mt-1.5" value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );



  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-5 space-y-3">
        <div>
          <h2 className="font-display text-lg">Orden y activación</h2>
          <p className="text-xs text-muted-foreground">Activa los métodos que quieres mostrar en el checkout y reordénalos con las flechas (arriba = primero).</p>
        </div>
        <div className="space-y-2">
          {order.map((id, idx) => {
            const meta = METHODS.find((x) => x.id === id)!;
            const enabledKey = `pay.${id}.enabled`;
            const enabled = (m[enabledKey] ?? "") === "1";
            return (
              <div key={id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(id, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => move(id, 1)} disabled={idx === order.length - 1} className="rounded p-1 hover:bg-background disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
                <meta.icon size={18} className="text-muted-foreground" />
                <span className="flex-1 text-sm font-semibold">{meta.label}</span>
                <span className="text-xs text-muted-foreground">{idx + 1}</span>
                <Switch checked={enabled} onCheckedChange={(v) => set(enabledKey, v ? "1" : "0")} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Yape</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="pay.yape.holder" label="Titular" placeholder="Nombre del titular" />
          <F k="pay.yape.phone" label="Número de celular" placeholder="9XX XXX XXX" />
          <F k="pay.yape.qr_url" label="URL del QR (opcional)" placeholder="https://..." />
        </div>
        <F k="pay.yape.note" label="Instrucciones para el cliente" area placeholder="Envía el comprobante por WhatsApp para confirmar tu pedido." />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Plin</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="pay.plin.holder" label="Titular" />
          <F k="pay.plin.phone" label="Número de celular" placeholder="9XX XXX XXX" />
          <F k="pay.plin.qr_url" label="URL del QR (opcional)" />
        </div>
        <F k="pay.plin.note" label="Instrucciones para el cliente" area />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Transferencia / Depósito bancario</h2>
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
        <h2 className="font-display text-lg">Pago contra entrega</h2>
        <F k="pay.cod.note" label="Nota de pago contra entrega" area />
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">General</h2>
        <F k="pay.confirm_whatsapp" label="WhatsApp para confirmar el pago" placeholder="51999999999 (sin + ni espacios)" />
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={!dirty || saving} size="lg">{saving ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}
