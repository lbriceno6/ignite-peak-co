import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { SUB_KEYS, DEFAULT_SUB_SETTINGS } from "@/hooks/useSubscriptionSettings";

const sb: any = supabase;

export default function AdminSubscription() {
  const [m, setM] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await sb.from("site_content").select("key,value").in("key", SUB_KEYS as unknown as string[]);
    const next: Record<string, string> = {
      "sub.enabled": "1",
      "sub.label": DEFAULT_SUB_SETTINGS.label,
      "sub.cancel_note": DEFAULT_SUB_SETTINGS.cancelNote,
      "sub.default_discount": String(DEFAULT_SUB_SETTINGS.defaultDiscount),
      "sub.default_intervals": DEFAULT_SUB_SETTINGS.defaultIntervals.join(","),
      "sub.benefits": DEFAULT_SUB_SETTINGS.benefits.join("\n"),
    };
    (data ?? []).forEach((r: any) => { next[r.key] = r.value ?? ""; });
    setM(next); setSaved(next);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setM((p) => ({ ...p, [k]: v }));
  const dirty = SUB_KEYS.some((k) => (m[k] ?? "") !== (saved[k] ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      const rows = SUB_KEYS.map((k) => ({ key: k, value: m[k] ?? "" }));
      const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Configuración de suscripción guardada");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg flex items-center gap-2"><Repeat size={18} className="text-accent" /> Suscríbete y ahorra</h2>
            <p className="text-xs text-muted-foreground">Configura el plan recurrente que verán los clientes en la ficha de producto. Estos valores se usan como predeterminados; cada producto puede sobreescribirlos.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <Switch checked={(m["sub.enabled"] ?? "1") === "1"} onCheckedChange={(v) => set("sub.enabled", v ? "1" : "0")} />
            <span className="text-xs font-semibold">{(m["sub.enabled"] ?? "1") === "1" ? "Activo" : "Inactivo"}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Texto de la oferta</Label>
            <Input className="mt-1.5" value={m["sub.label"] ?? ""} onChange={(e) => set("sub.label", e.target.value)} placeholder="Suscríbete y ahorra" />
            <p className="mt-1 text-[11px] text-muted-foreground">Aparecerá como “{m["sub.label"] || "Suscríbete y ahorra"} {m["sub.default_discount"] || "10"}%”.</p>
          </div>
          <div>
            <Label className="text-xs">Nota de cancelación</Label>
            <Input className="mt-1.5" value={m["sub.cancel_note"] ?? ""} onChange={(e) => set("sub.cancel_note", e.target.value)} placeholder="cancela cuando quieras" />
          </div>
          <div>
            <Label className="text-xs">Descuento por defecto (%)</Label>
            <Input className="mt-1.5" type="number" min={0} max={90} step={1} value={m["sub.default_discount"] ?? ""} onChange={(e) => set("sub.default_discount", e.target.value)} placeholder="10" />
          </div>
          <div>
            <Label className="text-xs">Intervalos (en días, separados por coma)</Label>
            <Input className="mt-1.5" value={m["sub.default_intervals"] ?? ""} onChange={(e) => set("sub.default_intervals", e.target.value)} placeholder="30,60,90" />
            <p className="mt-1 text-[11px] text-muted-foreground">Ejemplo: 15,30,45,60. El cliente podrá elegir cualquiera de estas frecuencias.</p>
          </div>
        </div>

        <div>
          <Label className="text-xs">Beneficios visibles al cliente (uno por línea)</Label>
          <Textarea className="mt-1.5" rows={5} value={m["sub.benefits"] ?? ""} onChange={(e) => set("sub.benefits", e.target.value)} placeholder={"Descuento automático en cada envío\nRecíbelo en la frecuencia que elijas\nPausa o cancela cuando quieras"} />
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={!dirty || saving} size="lg">{saving ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}
