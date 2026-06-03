import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Pencil, Zap } from "lucide-react";

type Settings = {
  enabled: boolean;
  provider: string;
  model: string;
  result_mode: string;
  confidence_threshold: number;
  temperature: number;
  max_tokens: number;
  search_prompt: string;
  helper_text: string;
  show_whatsapp_fallback: boolean;
  live_suggestions_enabled: boolean;
  visible_products_limit: number;
  manual_suggestions: string;
};

type Need = {
  id?: string;
  slug: string;
  name: string;
  keywords: string[];
  intent: string | null;
  related_category: string | null;
  related_products: string[];
  message: string | null;
  priority: number;
  is_active: boolean;
};

const PROVIDERS = [
  { value: "gemini", label: "Gemini (recomendado)" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude" },
  { value: "off", label: "IA desactivada" },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
    { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (barato)" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (calidad)" },
    { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
    { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
  ],
  openai: [
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
    { value: "openai/gpt-5.2", label: "GPT-5.2" },
    { value: "openai/gpt-5.4", label: "GPT-5.4" },
    { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "openai/gpt-5.5", label: "GPT-5.5" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  claude: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  off: [],
};

const RESULT_MODES = [
  { value: "todos", label: "Todos" },
  { value: "productos", label: "Solo productos" },
  { value: "categorias", label: "Solo categorías" },
  { value: "combos", label: "Solo combos" },
];

const DEFAULTS: Settings = {
  enabled: false,
  provider: "deepseek",
  model: "deepseek-chat",
  result_mode: "all",
  confidence_threshold: 0.4,
  temperature: 0.4,
  max_tokens: 600,
  search_prompt: "Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.",
  helper_text: "Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía",
  show_whatsapp_fallback: true,
  live_suggestions_enabled: true,
  visible_products_limit: 4,
  manual_suggestions: "omega 3, vitaminas, bienestar, colágeno, energía",
};

const EMPTY_NEED: Need = {
  slug: "",
  name: "",
  keywords: [],
  intent: "",
  related_category: "",
  related_products: [],
  message: "",
  priority: 100,
  is_active: true,
};

export default function AdminSearchAi() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [needs, setNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Need | null>(null);
  const [keywordsText, setKeywordsText] = useState("");

  useEffect(() => {
    (async () => {
      const [sRes, nRes, cRes, pRes] = await Promise.all([
        supabase.from("search_ai_settings" as any).select("*").eq("id", 1).maybeSingle(),
        supabase.from("search_needs" as any).select("*").order("priority"),
        supabase.from("categories").select("slug,name").eq("type", "product").eq("is_active", true).order("name"),
        supabase.from("products").select("id,name").eq("is_active", true).limit(500).order("name"),
      ]);
      if (sRes.data) setForm({ ...DEFAULTS, ...(sRes.data as any) });
      if (nRes.data) setNeeds(nRes.data as any);
      if (cRes.data) setCategories(cRes.data as any);
      if (pRes.data) setProducts(pRes.data as any);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("search_ai_settings" as any).upsert({ id: 1, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuración guardada");
  };

  const openNew = () => {
    setEditing({ ...EMPTY_NEED });
    setKeywordsText("");
  };
  const openEdit = (n: Need) => {
    setEditing({ ...n });
    setKeywordsText((n.keywords || []).join(", "));
  };

  const saveNeed = async () => {
    if (!editing) return;
    const payload = {
      ...editing,
      keywords: keywordsText.split(",").map((k) => k.trim()).filter(Boolean),
      slug: editing.slug || editing.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    };
    const { error } = editing.id
      ? await supabase.from("search_needs" as any).update(payload).eq("id", editing.id)
      : await supabase.from("search_needs" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Necesidad guardada");
    setEditing(null);
    const { data } = await supabase.from("search_needs" as any).select("*").order("priority");
    setNeeds((data as any) ?? []);
  };

  const deleteNeed = async (id?: string) => {
    if (!id) return;
    if (!confirm("¿Eliminar esta necesidad?")) return;
    const { error } = await supabase.from("search_needs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNeeds((p) => p.filter((n) => n.id !== id));
  };

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Configuración del Buscador IA</h1>
      </div>
      <p className="text-muted-foreground">
        Convierte el buscador en un asistente que entiende necesidades, no solo nombres de productos.
      </p>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="needs">Necesidades ({needs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 rounded-lg border bg-background p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activar Buscador IA</Label>
              <p className="text-xs text-muted-foreground">Si está apagado, se usa solo el buscador tradicional.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Proveedor IA</Label>
              <Select
                value={form.provider}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    provider: v,
                    model: MODELS[v]?.[0]?.value ?? p.model,
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              {(MODELS[form.provider]?.length ?? 0) > 0 ? (
                <Select value={form.model} onValueChange={(v) => setForm((p) => ({ ...p, model: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un modelo" /></SelectTrigger>
                  <SelectContent>
                    {MODELS[form.provider].map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                    {!MODELS[form.provider].some((m) => m.value === form.model) && form.model && (
                      <SelectItem value={form.model}>{form.model} (personalizado)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="nombre-del-modelo"
                />
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>API Key (opcional para Gemini/OpenAI; requerida para DeepSeek/Claude)</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.api_key || ""}
                  onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
                  placeholder="—"
                  className="pr-10 font-mono text-xs"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Modo de resultado</Label>
              <Select value={form.result_mode} onValueChange={(v) => setForm((p) => ({ ...p, result_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_MODES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Confianza mínima ({form.min_confidence})</Label>
              <Input type="number" step="0.05" min={0} max={1} value={form.min_confidence}
                onChange={(e) => setForm((p) => ({ ...p, min_confidence: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Temperatura ({form.temperature})</Label>
              <Input type="number" step="0.1" min={0} max={2} value={form.temperature}
                onChange={(e) => setForm((p) => ({ ...p, temperature: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. tokens</Label>
              <Input type="number" min={100} max={4000} value={form.max_tokens}
                onChange={(e) => setForm((p) => ({ ...p, max_tokens: Number(e.target.value) || 600 }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prompt del buscador IA</Label>
            <Textarea rows={10} value={form.prompt_template}
              onChange={(e) => setForm((p) => ({ ...p, prompt_template: e.target.value }))} />
            <p className="text-xs text-muted-foreground">
              No prometas curación. Devuelve siempre JSON con: intent, need, category, products, message.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Texto de ayuda bajo el buscador</Label>
              <Input value={form.helper_text}
                onChange={(e) => setForm((p) => ({ ...p, helper_text: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Mostrar WhatsApp si no hay resultados</Label>
                <p className="text-xs text-muted-foreground">Sugiere hablar con Lucía cuando no haya match.</p>
              </div>
              <Switch checked={form.fallback_whatsapp_enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, fallback_whatsapp_enabled: v }))} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-secondary/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Sugerencias en vivo</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar panel desplegable con productos y sugerencias mientras el cliente escribe.
                </p>
              </div>
              <Switch
                checked={form.live_suggestions_enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, live_suggestions_enabled: v }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Productos visibles en el desplegable</Label>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  value={form.max_products}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, max_products: Math.max(2, Math.min(12, Number(e.target.value) || 4)) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sugerencias manuales (separadas por coma)</Label>
                <Input
                  value={(form.manual_suggestions ?? []).join(", ")}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      manual_suggestions: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="omega 3, vitaminas, colágeno…"
                />
              </div>
            </div>
          </div>


          <div className="flex justify-end pt-2">
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar configuración"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="needs" className="space-y-4 rounded-lg border bg-background p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mapea necesidades del cliente (ej: "cansancio") a categorías y productos.
            </p>
            <Button onClick={openNew} className="gap-1.5"><Plus size={14} /> Nueva necesidad</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Palabras clave</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Prio.</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {needs.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{(n.keywords || []).join(", ")}</TableCell>
                  <TableCell className="text-xs">{n.related_category}</TableCell>
                  <TableCell className="text-xs">{(n.related_products || []).length}</TableCell>
                  <TableCell>{n.priority}</TableCell>
                  <TableCell>{n.is_active ? "Sí" : "No"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteNeed(n.id)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar necesidad" : "Nueva necesidad"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Nombre</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="energia" />
                </div>
              </div>
              <div>
                <Label>Palabras clave (separadas por coma)</Label>
                <Textarea rows={2} value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="cansancio, fatiga, sueño, vitalidad" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Intención</Label>
                  <Input value={editing.intent || ""} onChange={(e) => setEditing({ ...editing, intent: e.target.value })} />
                </div>
                <div>
                  <Label>Categoría relacionada</Label>
                  <Select value={editing.related_category || ""} onValueChange={(v) => setEditing({ ...editing, related_category: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Productos relacionados</Label>
                <select
                  multiple
                  value={editing.related_products}
                  onChange={(e) => setEditing({ ...editing, related_products: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                  className="mt-1 h-40 w-full rounded-md border bg-background p-2 text-sm"
                >
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ctrl/Cmd + clic para seleccionar varios. {editing.related_products.length} seleccionados.
                </p>
              </div>
              <div>
                <Label>Mensaje humano</Label>
                <Input value={editing.message || ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                  placeholder="Productos recomendados para energía." />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Prioridad</Label>
                  <Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) || 100 })} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Activa</Label>
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="dark" onClick={saveNeed}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
