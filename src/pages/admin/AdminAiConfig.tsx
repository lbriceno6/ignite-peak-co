import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const PROVIDERS = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude" },
  { value: "deepseek", label: "DeepSeek" },
];

const LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "vendedor", label: "Muy vendedor" },
  { value: "premium", label: "Premium" },
];

const IMAGE_PROVIDERS = [
  { value: "gemini", label: "Gemini (Lovable AI)" },
  { value: "openai", label: "OpenAI" },
];

const IMAGE_SIZES = ["512x512", "1024x1024", "1200x1200", "1600x1600"];
const IMAGE_FORMATS = ["webp", "png", "jpg"];
const IMAGE_BACKGROUNDS = [
  { value: "white_ecommerce", label: "Blanco ecommerce" },
  { value: "transparent", label: "Transparente" },
  { value: "premium_jar", label: "Premium frasco" },
  { value: "premium_box", label: "Premium caja" },
];

export default function AdminAiConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    default_provider: "gemini",
    default_level: "equilibrado",
    gemini_api_key: "",
    openai_api_key: "",
    claude_api_key: "",
    deepseek_api_key: "",
    image_provider: "gemini",
    image_api_key: "",
    image_default_size: "1200x1200",
    image_default_format: "webp",
    image_default_background: "white_ecommerce",
    image_quality: 85,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ai_product_settings" as any).select("*").eq("id", 1).maybeSingle();
      if (data) setForm((p) => ({ ...p, ...(data as any) }));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_product_settings" as any)
      .upsert({ id: 1, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuración de IA guardada");
  };

  const keyField = (label: string, key: keyof typeof form, hint: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show[key] ? "text" : "password"}
          value={(form as any)[key] ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          placeholder="—"
          className="pr-10 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Mostrar/ocultar"
        >
          {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  const anyKey = form.gemini_api_key || form.openai_api_key || form.claude_api_key || form.deepseek_api_key;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Configuración de IA</h1>
      </div>
      <p className="text-muted-foreground">
        Define el proveedor y nivel por defecto del asistente de productos, y opcionalmente tus propias API Keys.
        Gemini y OpenAI funcionan sin API Key gracias a Lovable AI.
      </p>

      {!anyKey && (
        <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
          Configura tu API Key para usar el asistente IA con Claude o DeepSeek (Gemini y OpenAI ya funcionan por defecto).
        </div>
      )}

      <div className="rounded-lg border bg-background p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Modelo IA predeterminado</Label>
            <Select value={form.default_provider} onValueChange={(v) => setForm((p) => ({ ...p, default_provider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nivel de contenido predeterminado</Label>
            <Select value={form.default_level} onValueChange={(v) => setForm((p) => ({ ...p, default_level: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {keyField("API Key de Gemini", "gemini_api_key", "Opcional. Si está vacía se usa Lovable AI.")}
          {keyField("API Key de OpenAI", "openai_api_key", "Opcional. Si está vacía se usa Lovable AI.")}
          {keyField("API Key de Claude", "claude_api_key", "Requerida para usar Claude (Anthropic).")}
          {keyField("API Key de DeepSeek", "deepseek_api_key", "Requerida si no tienes secreto del servidor.")}
        </div>

      </div>

      <div className="rounded-lg border bg-background p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl">Configuración IA de imágenes</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Define el proveedor y los valores por defecto para el editor IA de imágenes del producto.
        </p>

        {!form.image_api_key && form.image_provider !== "gemini" && (
          <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
            Configura tu API Key para usar el editor IA de imágenes.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Proveedor IA para imágenes</Label>
            <Select value={form.image_provider} onValueChange={(v) => setForm((p) => ({ ...p, image_provider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {keyField("API Key de imágenes", "image_api_key", "Opcional si usas Gemini (Lovable AI).")}
          <div className="space-y-1.5">
            <Label>Tamaño predeterminado</Label>
            <Select value={form.image_default_size} onValueChange={(v) => setForm((p) => ({ ...p, image_default_size: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Formato predeterminado</Label>
            <Select value={form.image_default_format} onValueChange={(v) => setForm((p) => ({ ...p, image_default_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_FORMATS.map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fondo predeterminado</Label>
            <Select value={form.image_default_background} onValueChange={(v) => setForm((p) => ({ ...p, image_default_background: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_BACKGROUNDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Calidad de compresión ({form.image_quality})</Label>
            <Input
              type="number"
              min={40}
              max={100}
              value={form.image_quality}
              onChange={(e) => setForm((p) => ({ ...p, image_quality: Number(e.target.value) || 85 }))}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="dark" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}
