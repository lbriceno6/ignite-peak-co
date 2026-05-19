import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Loader2, Info } from "lucide-react";

const KEYS = [
  "email.provider",
  "email.from_name",
  "email.from_email",
  "email.reply_to",
  "email.sender_domain",
  "email.notify_admin_email",
  "email.notify_on_order",
  "email.notify_on_subscription",
  "email.smtp_host",
  "email.smtp_port",
  "email.smtp_user",
  "email.smtp_password",
  "email.api_key",
  "email.api_url",
  "email.footer_note",
] as const;

const defaults: Record<string, string> = {
  "email.provider": "lovable",
  "email.from_name": "Nutribatidos",
  "email.from_email": "notify@nutribatidos.com",
  "email.reply_to": "",
  "email.sender_domain": "notify.nutribatidos.com",
  "email.notify_admin_email": "",
  "email.notify_on_order": "true",
  "email.notify_on_subscription": "true",
  "email.smtp_host": "",
  "email.smtp_port": "587",
  "email.smtp_user": "",
  "email.smtp_password": "",
  "email.api_key": "",
  "email.api_url": "",
  "email.footer_note": "",
};

export default function AdminEmail() {
  const [v, setV] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("key,value").in("key", KEYS as any);
      const map: Record<string, string> = { ...defaults };
      (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
      setV(map);
      setLoading(false);
    })();
  }, []);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({ key: k, value: v[k] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Configuración de email guardada");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  const provider = v["email.provider"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Mail size={22} />
        <h1 className="font-display text-3xl">Configuración de email</h1>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>Configura el remitente y el proveedor de email. Por defecto se usa Lovable Cloud (dominio <code>notify.nutribatidos.com</code>). Si eliges otro proveedor, agrega sus credenciales abajo.</p>
      </div>

      <Section title="Remitente">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del remitente">
            <Input value={v["email.from_name"]} onChange={(e) => set("email.from_name", e.target.value)} />
          </Field>
          <Field label="Email del remitente (From)">
            <Input value={v["email.from_email"]} onChange={(e) => set("email.from_email", e.target.value)} placeholder="notify@tudominio.com" />
          </Field>
          <Field label="Reply-To (opcional)">
            <Input value={v["email.reply_to"]} onChange={(e) => set("email.reply_to", e.target.value)} placeholder="soporte@tudominio.com" />
          </Field>
          <Field label="Dominio de envío (subdominio verificado)">
            <Input value={v["email.sender_domain"]} onChange={(e) => set("email.sender_domain", e.target.value)} placeholder="notify.tudominio.com" />
          </Field>
        </div>
      </Section>

      <Section title="Proveedor de email">
        <Field label="Proveedor">
          <Select value={provider} onValueChange={(val) => set("email.provider", val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lovable">Lovable Cloud (predeterminado)</SelectItem>
              <SelectItem value="resend">Resend</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="mailgun">Mailgun</SelectItem>
              <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
              <SelectItem value="postmark">Postmark</SelectItem>
              <SelectItem value="ses">Amazon SES</SelectItem>
              <SelectItem value="smtp">SMTP personalizado</SelectItem>
              <SelectItem value="custom">API personalizada</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {provider === "smtp" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Servidor SMTP"><Input value={v["email.smtp_host"]} onChange={(e) => set("email.smtp_host", e.target.value)} placeholder="smtp.tudominio.com" /></Field>
            <Field label="Puerto"><Input value={v["email.smtp_port"]} onChange={(e) => set("email.smtp_port", e.target.value)} placeholder="587" /></Field>
            <Field label="Usuario"><Input value={v["email.smtp_user"]} onChange={(e) => set("email.smtp_user", e.target.value)} /></Field>
            <Field label="Contraseña"><Input type="password" value={v["email.smtp_password"]} onChange={(e) => set("email.smtp_password", e.target.value)} /></Field>
          </div>
        )}

        {["resend", "sendgrid", "mailgun", "brevo", "postmark", "ses", "custom"].includes(provider) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="API Key">
              <Input type="password" value={v["email.api_key"]} onChange={(e) => set("email.api_key", e.target.value)} placeholder="sk_..." />
            </Field>
            <Field label="URL del API (opcional)">
              <Input value={v["email.api_url"]} onChange={(e) => set("email.api_url", e.target.value)} placeholder="https://api.proveedor.com/v1/send" />
            </Field>
          </div>
        )}

        {provider !== "lovable" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Nota: las claves sensibles deben almacenarse como secretos del backend para producción. Esta pantalla guarda la preferencia de proveedor.
          </p>
        )}
      </Section>

      <Section title="Notificaciones automáticas">
        <Field label="Email del administrador (recibe avisos)">
          <Input value={v["email.notify_admin_email"]} onChange={(e) => set("email.notify_admin_email", e.target.value)} placeholder="admin@tudominio.com" />
        </Field>
        <div className="mt-3 flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Avisar nuevos pedidos</Label>
            <p className="text-xs text-muted-foreground">Envía email al admin cuando llega un pedido.</p>
          </div>
          <Switch checked={v["email.notify_on_order"] === "true"} onCheckedChange={(c) => set("email.notify_on_order", c ? "true" : "false")} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Avisar suscripciones</Label>
            <p className="text-xs text-muted-foreground">Envía email al cliente antes de cada entrega/cobro.</p>
          </div>
          <Switch checked={v["email.notify_on_subscription"] === "true"} onCheckedChange={(c) => set("email.notify_on_subscription", c ? "true" : "false")} />
        </div>
      </Section>

      <Section title="Pie de página de los emails">
        <Field label="Texto de pie de página (opcional)">
          <Textarea rows={3} value={v["email.footer_note"]} onChange={(e) => set("email.footer_note", e.target.value)} placeholder="Nutribatidos · Lima, Perú" />
        </Field>
      </Section>

      <div className="flex justify-end">
        <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</Button>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border bg-background p-6">
    <h2 className="mb-4 font-display text-lg">{title}</h2>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
