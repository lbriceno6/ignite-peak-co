import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2, Wand2, CheckCircle2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";

type Suggestions = {
  name?: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  badge?: string;
  main_ingredient?: string;
  goal?: string;
  flavor?: string;
  size?: string;
  size_variants?: string;
  usage_instructions?: string;
  ingredients?: string;
  nutrition_facts?: Record<string, string>;
  faqs?: { q: string; a: string }[];
  commercial_pitch?: string;
  seo_title?: string;
  seo_description?: string;
};

const PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-4o-mini)" },
  { value: "gemini", label: "Gemini" },
  { value: "lovable", label: "Lovable AI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude" },
];

const LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "vendedor", label: "Muy vendedor" },
  { value: "premium", label: "Premium" },
];

// Campos auto-aplicables vs sólo-sugerencia
const AUTO_FIELDS: (keyof Suggestions)[] = [
  "name", "slug", "short_description", "description", "category", "subcategory", "badge",
  "main_ingredient", "goal", "flavor", "size", "size_variants",
  "usage_instructions", "ingredients", "nutrition_facts", "faqs",
];

type Props = {
  product: any;
  isEdit: boolean;
  onApply: (patch: Record<string, any>) => void;
};

export function ProductAiAssistant({ product, isEdit, onApply }: Props) {
  const [provider, setProvider] = useState("gemini");
  const [level, setLevel] = useState("equilibrado");
  const [autoFill, setAutoFill] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [missingKey, setMissingKey] = useState<string | null>(null);
  const [goalCards, setGoalCards] = useState<{ name: string; slug: string }[]>([]);

  const loadGoals = async () => {
    const { data } = await supabase
      .from("goal_cards" as any)
      .select("name, slug")
      .eq("is_active", true)
      .order("sort_order");
    setGoalCards(((data as any[]) ?? []).map((g) => ({ name: g.name, slug: g.slug })));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_product_settings" as any)
        .select("default_provider, default_level")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        if ((data as any).default_provider) setProvider((data as any).default_provider);
        if ((data as any).default_level) setLevel((data as any).default_level);
      }
      loadGoals();
    })();
  }, []);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const matchedGoal = (g?: string) =>
    g ? goalCards.find((gc) => normalize(gc.name) === normalize(g)) : undefined;

  const createGoalCard = async (name: string) => {
    const slug = slugify(name);
    const nextOrder = (goalCards.length ?? 0) + 1;
    const { error } = await supabase.from("goal_cards" as any).insert({
      slug, name, description: `Productos para ${name.toLowerCase()}.`,
      cta_label: "Ver productos", cta_href: `/objetivo/${slug}`, sort_order: nextOrder, is_active: true,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Goal card "${name}" creado.`);
    await loadGoals();
  };

  const toPatch = (s: Suggestions): Record<string, any> => {
    const patch: Record<string, any> = {};
    if (s.name) patch.name = s.name;
    if (s.slug) patch.slug = s.slug;
    if (s.short_description) patch.short_description = s.short_description;
    if (s.description) patch.description = s.description;
    if (s.category) patch.category = s.category;
    if (s.subcategory) patch.subcategory = s.subcategory;
    if (s.badge !== undefined) patch.badge = s.badge;
    if (s.main_ingredient) patch.main_ingredient = s.main_ingredient;
    if (s.goal) {
      // Guardar siempre el slug del goal card si existe, para conectar con /objetivo/{slug}
      const m = matchedGoal(s.goal);
      patch.goal = m ? m.slug : s.goal;
    }
    if (s.flavor) patch.flavor = s.flavor;
    if (s.size) patch.size = s.size;
    if (s.size_variants) patch.size_variants = s.size_variants;
    if (s.usage_instructions) patch.usage_instructions = s.usage_instructions;
    if (s.ingredients) patch.ingredients = s.ingredients;
    if (s.nutrition_facts) patch.nutrition_facts = JSON.stringify(s.nutrition_facts, null, 2);
    if (s.faqs) patch.faqs = JSON.stringify(s.faqs, null, 2);
    return patch;
  };

  const generate = async (mode: "fill" | "improve" = "fill") => {
    setLoading(true);
    setMissingKey(null);
    try {
      const { data, error } = await supabase.functions.invoke("product-ai-generate", {
        body: {
          provider,
          level,
          mode,
          product: {
            name: product.name,
            slug: product.slug,
            short_description: product.short_description,
            description: product.description,
            price: product.price,
            sale_price: product.sale_price,
            category: product.category,
            subcategory: product.subcategory,
            badge: product.badge,
            main_ingredient: product.main_ingredient,
            goal: product.goal,
            flavor: product.flavor,
            size: product.size,
            size_variants: product.size_variants,
            usage_instructions: product.usage_instructions,
            ingredients: product.ingredients,
            nutrition_facts: product.nutrition_facts,
            faqs: product.faqs,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s: Suggestions = (data as any).suggestions ?? {};
      setSuggestions(s);

      if (autoFill && mode === "fill") {
        onApply(toPatch(s));
        toast.success("Datos aplicados automáticamente al formulario.");
      } else {
        setOpen(true);
      }
    } catch (e: any) {
      const msg = e?.message || "Error al generar con IA";
      if (msg.toLowerCase().includes("api key")) {
        setMissingKey(msg);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const applySubset = (keys: (keyof Suggestions)[]) => {
    if (!suggestions) return;
    const subset: Suggestions = {};
    keys.forEach((k) => { if (suggestions[k] !== undefined) (subset as any)[k] = suggestions[k]; });
    onApply(toPatch(subset));
    toast.success("Sugerencias aplicadas.");
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" size={20} />
        <h3 className="font-semibold text-lg">Asistente IA para producto</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Usa los datos ya escritos en el formulario para generar o mejorar el contenido del producto.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Modelo IA</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Nivel de contenido</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={autoFill} onCheckedChange={setAutoFill} />
        <Label>Incluir todos los datos automáticamente</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Si está activado, se aplican directamente los campos editables. Precio, stock, proveedor e imágenes nunca se reemplazan.
      </p>

      {missingKey && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {missingKey} <a className="underline ml-1" href="/admin/ai-config">Ir a Configuración de IA</a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => generate("fill")} disabled={loading} variant="dark">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? "Generando…" : "Generar datos con IA"}
        </Button>
        {isEdit && (
          <Button type="button" onClick={() => generate("improve")} disabled={loading} variant="outline">
            <Wand2 size={16} /> Mejorar con IA
          </Button>
        )}
      </div>

      {suggestions && (suggestions.main_ingredient || suggestions.goal) && (
        <div className="rounded-md border bg-background p-3 text-sm space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen IA</div>
          {suggestions.main_ingredient && (
            <div><b>Ingrediente principal:</b> {suggestions.main_ingredient}</div>
          )}
          {suggestions.goal && (() => {
            const m = matchedGoal(suggestions.goal);
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span><b>Objetivo:</b> {suggestions.goal}</span>
                {m ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={12} /> Conectado con Goal cards
                  </span>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={() => createGoalCard(suggestions.goal!)}>
                    <PlusCircle size={14} /> Crear objetivo "{suggestions.goal}"
                  </Button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa de sugerencias IA</DialogTitle>
          </DialogHeader>
          {suggestions && (
            <div className="space-y-4 text-sm">
              <PreviewBlock label="Nombre" value={suggestions.name} />
              <PreviewBlock label="Slug" value={suggestions.slug} />
              <PreviewBlock label="Descripción corta" value={suggestions.short_description} />
              <PreviewBlock label="Descripción larga" value={suggestions.description} />
              <div className="grid grid-cols-2 gap-3">
                <PreviewBlock label="Categoría principal" value={suggestions.category} />
                <PreviewBlock label="Subcategoría" value={suggestions.subcategory} />
                <PreviewBlock label="Etiqueta" value={suggestions.badge} />
                <PreviewBlock label="Ingrediente principal" value={suggestions.main_ingredient} />
                <PreviewBlock label="Objetivo" value={suggestions.goal} />
                <PreviewBlock label="Sabor" value={suggestions.flavor} />
                <PreviewBlock label="Tamaño" value={suggestions.size} />
              </div>
              <PreviewBlock label="Presentaciones / variantes" value={suggestions.size_variants} mono />
              <PreviewBlock label="Instrucciones de uso" value={suggestions.usage_instructions} />
              <PreviewBlock label="Ingredientes" value={suggestions.ingredients} />
              <PreviewBlock label="Información nutricional" value={suggestions.nutrition_facts ? JSON.stringify(suggestions.nutrition_facts, null, 2) : ""} mono />
              <PreviewBlock label="Preguntas frecuentes" value={suggestions.faqs ? JSON.stringify(suggestions.faqs, null, 2) : ""} mono />
              {suggestions.commercial_pitch && <PreviewBlock label="Texto comercial sugerido" value={suggestions.commercial_pitch} />}
              {(suggestions.seo_title || suggestions.seo_description) && (
                <div className="rounded-md border bg-muted/40 p-3 text-xs">
                  <div className="font-medium mb-1">SEO sugerido (cópialo al editor SEO si lo deseas)</div>
                  {suggestions.seo_title && <div><b>Título:</b> {suggestions.seo_title}</div>}
                  {suggestions.seo_description && <div><b>Descripción:</b> {suggestions.seo_description}</div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="dark" onClick={() => { if (suggestions) { onApply(toPatch(suggestions)); toast.success("Todo aplicado."); setOpen(false); } }}>Aplicar todo</Button>
            <Button variant="outline" onClick={() => applySubset(["category", "subcategory"])}>Aplicar categoría y subcategoría</Button>
            <Button variant="outline" onClick={() => applySubset(["short_description", "description"])}>Aplicar solo descripción</Button>
            <Button variant="outline" onClick={() => applySubset(["usage_instructions"])}>Instrucciones de uso</Button>
            <Button variant="outline" onClick={() => applySubset(["ingredients"])}>Ingredientes</Button>
            <Button variant="outline" onClick={() => applySubset(["nutrition_facts"])}>Información nutricional</Button>
            <Button variant="outline" onClick={() => applySubset(["faqs"])}>Preguntas frecuentes</Button>
            <Button variant="outline" onClick={() => { setOpen(false); generate("fill"); }} disabled={loading}>Regenerar</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewBlock({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className={`rounded-md border bg-background p-2 whitespace-pre-wrap ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
