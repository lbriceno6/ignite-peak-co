import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const KEYS = [
  "contact_eyebrow",
  "contact_title",
  "contact_intro",
  "contact_whatsapp_value",
  "contact_whatsapp_note",
  "contact_email_value",
  "contact_email_note",
  "contact_address_value",
  "contact_address_note",
  "contact_hours_value",
  "contact_hours_note",
] as const;

const sb: any = supabase;

export default function AdminContact() {
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
      toast.success("Página de contacto guardada");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const F = ({ k, label, area }: { k: string; label: string; area?: boolean }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      {area ? (
        <Textarea className="mt-1.5" rows={3} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <Input className="mt-1.5" value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Encabezado</h2>
        <F k="contact_eyebrow" label="Etiqueta" />
        <F k="contact_title" label="Título" />
        <F k="contact_intro" label="Introducción" area />
      </div>

      {[
        { t: "WhatsApp", v: "contact_whatsapp_value", n: "contact_whatsapp_note" },
        { t: "Correo", v: "contact_email_value", n: "contact_email_note" },
        { t: "Dirección", v: "contact_address_value", n: "contact_address_note" },
        { t: "Horario", v: "contact_hours_value", n: "contact_hours_note" },
      ].map((c) => (
        <div key={c.t} className="rounded-lg border bg-background p-5 space-y-4">
          <h2 className="font-display text-lg">{c.t}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <F k={c.v} label="Valor" />
            <F k={c.n} label="Nota" />
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={!dirty || saving} size="lg">{saving ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}
