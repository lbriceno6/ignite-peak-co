import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Zap } from "lucide-react";

const PROVIDERS = [
  { value: "gemini", label: "Gemini (Lovable AI · sin API Key)" },
  { value: "openai", label: "OpenAI (Lovable AI · sin API Key)" },
  { value: "claude", label: "Claude (requiere API Key)" },
  { value: "deepseek", label: "DeepSeek (requiere API Key)" },
  { value: "custom", label: "Personalizado" },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  openai: [
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  ],
  claude: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  custom: [],
};

const DEFAULT_PROMPT = `Eres una IA de recomendaciones para el ecommerce Nutribatidos. Tu función es detectar la intención del cliente según búsquedas, clics, productos vistos, categorías visitadas, productos agregados al carrito e historial reciente. Solo puedes recomendar productos existentes del catálogo. No inventes productos, categorías ni promociones. No hagas diagnósticos médicos ni prometas curas. Devuelve siempre JSON con: intencion, confianza, productos_recomendados, categorias_recomendadas, packs_recomendados, mensaje_banner, cta.`;

export default function AdminAIRecommendations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    provider: "gemini",
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    confidence_threshold: 0.7,
    system_prompt: DEFAULT_PROMPT,
    base_url: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_reco_settings" as any)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) setForm((p) => ({ ...p, ...(data as any) }));
      setLoading(false);
    })();
  }, []);

  const onProviderChange = (v: string) => {
    setForm((p) => ({
      ...p,
      provider: v,
      model: MODELS[v]?.[0]?.value ?? p.model,
    }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_reco_settings" as any)
      .upsert({ id: 1, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuración guardada");
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-reco-test", {
        body: {
          provider: form.provider,
          model: form.model,
          base_url: form.base_url || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.success) {
        toast.success("Conexión exitosa con el proveedor de IA");
      } else {
        toast.error(`Error de conexión: ${(data as any)?.error || "respuesta inválida"}`);
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message ?? e}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  const needsServerSecret = form.provider === "claude" || form.provider === "deepseek" || form.provider === "custom";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Home Inteligente · Configuración de IA</h1>
      </div>
      <p className="text-muted-foreground">
        Define el proveedor, modelo y comportamiento del motor de recomendaciones IA que adapta
        bloques del Home, productos relacionados y resultados del buscador inteligente.
      </p>

      <div className="rounded-lg border bg-background p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Activar IA de recomendaciones</Label>
            <p className="text-xs text-muted-foreground">
              Si está desactivado, el Home usará reglas manuales, destacados y más vendidos.
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select value={form.provider} onValueChange={onProviderChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            {form.provider === "custom" ? (
              <Input
                value={form.model}
                onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                placeholder="nombre-del-modelo"
              />
            ) : (
              <Select
                value={form.model}
                onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(MODELS[form.provider] ?? []).map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {form.provider === "custom" && (
          <div className="space-y-1.5">
            <Label>URL base del proveedor</Label>
            <Input
              value={form.base_url ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
              placeholder="https://mi-proveedor.com/v1"
            />
          </div>
        )}

        {needsServerSecret && (
          <div className="rounded-md border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">
              La prueba usa solo Secrets del servidor. No pegues API Keys reales en el panel.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Temperatura ({form.temperature})</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={form.temperature}
              onChange={(e) =>
                setForm((p) => ({ ...p, temperature: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Umbral de confianza ({form.confidence_threshold})</Label>
            <Input
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={form.confidence_threshold}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  confidence_threshold: Number(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Si la IA devuelve menos de este valor, se muestra contenido general.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Prompt del sistema</Label>
          <Textarea
            rows={10}
            value={form.system_prompt}
            onChange={(e) => setForm((p) => ({ ...p, system_prompt: e.target.value }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing}
          >
            <Zap className="mr-2 h-4 w-4" />
            {testing ? "Probando…" : "Probar conexión con IA"}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}
