import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { optimizeForCatalog } from "@/lib/imageOptimize";
import { slugify } from "@/lib/slug";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: any[];
  onDone: () => void;
};

type OptionKey =
  | "content"
  | "main_ingredient"
  | "goal"
  | "badge"
  | "stock"
  | "detect_brand"
  | "create_brand"
  | "optimize_image"
  | "publish_approve"
  | "publish_activate";

const OPTIONS: { key: OptionKey; label: string }[] = [
  { key: "content", label: "Completar contenido con IA (nombre, descripciones, categoría, SEO)" },
  { key: "main_ingredient", label: "Completar ingrediente principal" },
  { key: "goal", label: "Completar objetivo (conectado a Goal cards)" },
  { key: "badge", label: 'Asignar etiqueta "Nuevo producto" si está vacía' },
  { key: "stock", label: "Asignar stock inicial 10 si está vacío o en 0" },
  { key: "detect_brand", label: "Detectar marca desde la imagen" },
  { key: "create_brand", label: "Crear marca si no existe (solo si confianza alta)" },
  { key: "optimize_image", label: "Optimizar imagen con IA (fondo blanco ecommerce, WebP)" },
  { key: "publish_approve", label: "Aprobar automáticamente si está completo" },
  { key: "publish_activate", label: "Activar automáticamente si está completo" },
];

const BUCKET = "blog-images";
const CONFIDENCE_HIGH = 0.8;

type RowState = {
  id: string;
  name: string;
  status: "pending" | "running" | "ok" | "skipped" | "error";
  messages: string[];
  brand_suggestion?: { name: string; confidence: number } | null;
};

async function uploadBlob(blob: Blob, prefix: string, ext: string): Promise<string> {
  const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType: blob.type || `image/${ext}`,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function BulkAiCompleteDialog({ open, onOpenChange, products, onDone }: Props) {
  const [opts, setOpts] = useState<Record<OptionKey, boolean>>({
    content: true,
    main_ingredient: true,
    goal: true,
    badge: true,
    stock: true,
    detect_brand: true,
    create_brand: true,
    optimize_image: true,
    publish_approve: true,
    publish_activate: true,
  });
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [done, setDone] = useState(0);
  const [goalCards, setGoalCards] = useState<{ name: string; slug: string }[]>([]);
  const [provider, setProvider] = useState<"openai" | "gemini" | "lovable" | "deepseek">("openai");
  const [fallback, setFallback] = useState<"none" | "openai" | "gemini" | "lovable" | "deepseek">("lovable");

  useEffect(() => {
    if (!open) return;
    setRows(products.map((p) => ({ id: p.id, name: p.name, status: "pending", messages: [] })));
    setDone(0);
    (async () => {
      const { data } = await supabase
        .from("goal_cards" as any)
        .select("name, slug")
        .eq("is_active", true);
      setGoalCards(((data as any[]) ?? []).map((g) => ({ name: g.name, slug: g.slug })));
    })();
  }, [open, products]);

  const total = products.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const updateRow = (id: string, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, messages: patch.messages ? [...r.messages, ...patch.messages] : r.messages } : r)));

  const resolveGoalSlug = (g: string | undefined | null): string | undefined => {
    if (!g) return undefined;
    const n = normalize(g);
    const found = goalCards.find((gc) => gc.slug === g || gc.slug === n || normalize(gc.name) === n);
    return found?.slug ?? g;
  };

  const processOne = async (p: any) => {
    updateRow(p.id, { status: "running" });
    const patch: Record<string, any> = {};
    const seoPatch: Record<string, any> = {};
    const reasons: string[] = [];
    let mainImage = p.main_image as string | null;

    // 1) Content AI
    let aiKeywords: string[] = [];
    if (opts.content || opts.main_ingredient || opts.goal) {
      try {
        const { data, error } = await supabase.functions.invoke("product-ai-generate", {
          body: {
            provider: "gemini",
            level: "equilibrado",
            mode: "fill",
            product: {
              name: p.name, slug: p.slug,
              short_description: p.short_description, description: p.description,
              category: p.category, subcategory: p.subcategory, badge: p.badge,
              main_ingredient: p.main_ingredient, goal: p.goal,
              flavor: p.flavor, size: p.size,
              ingredients: p.ingredients, usage_instructions: p.usage_instructions,
            },
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const s = ((data as any).suggestions ?? {}) as any;
        if (opts.content) {
          if (s.name && !p.name) patch.name = s.name;
          if (s.short_description) patch.short_description = s.short_description;
          if (s.description) patch.description = s.description;
          if (s.category && !p.category) patch.category = s.category;
          if (s.subcategory && !p.subcategory) patch.subcategory = s.subcategory;
          if (s.seo_title) seoPatch.seo_title = String(s.seo_title).slice(0, 70);
          if (s.seo_description) seoPatch.seo_description = String(s.seo_description).slice(0, 180);
          if (Array.isArray(s.seo_keywords)) {
            aiKeywords = s.seo_keywords.filter((k: any) => typeof k === "string");
            if (aiKeywords.length) seoPatch.keywords = aiKeywords;
          }
        }
        if (opts.main_ingredient && s.main_ingredient && !p.main_ingredient) {
          patch.main_ingredient = s.main_ingredient;
        }
        if (opts.goal && s.goal && !p.goal) {
          patch.goal = resolveGoalSlug(s.goal);
        }
        updateRow(p.id, { messages: ["Contenido IA OK"] });
      } catch (e: any) {
        updateRow(p.id, { messages: [`Contenido IA: ${e?.message ?? "error"}`] });
      }
    }

    // 2) Defaults
    if (opts.badge && !p.badge) patch.badge = "new";
    if (opts.stock && (!Number(p.stock) || Number(p.stock) <= 0)) patch.stock = 10;

    // 3) Brand detection
    let brandSuggestion: { name: string; confidence: number } | null = null;
    if (opts.detect_brand && (p.main_image || mainImage)) {
      try {
        const { data, error } = await supabase.functions.invoke("product-detect-brand", {
          body: { image_url: mainImage || p.main_image },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const brandName: string = (data as any).brand_name || "";
        const confidence: number = (data as any).confidence || 0;
        const matched = (data as any).matched_brand;
        if (matched) {
          if (!p.brand_id) patch.brand_id = matched.id;
          if (!p.brand) patch.brand = matched.name;
          updateRow(p.id, { messages: [`Marca: ${matched.name} (existente)`] });
        } else if (brandName) {
          if (opts.create_brand && confidence >= CONFIDENCE_HIGH) {
            // Create brand
            const slug = slugify(brandName);
            const { data: existing } = await supabase.from("brands").select("id, name, slug").eq("slug", slug).maybeSingle();
            let brandId = (existing as any)?.id;
            if (!brandId) {
              const { data: created, error: cErr } = await supabase
                .from("brands")
                .insert({ name: brandName, slug, is_active: true } as any)
                .select("id")
                .single();
              if (cErr) throw cErr;
              brandId = (created as any).id;
              updateRow(p.id, { messages: [`Marca "${brandName}" creada (confianza ${(confidence * 100).toFixed(0)}%)`] });
            } else {
              updateRow(p.id, { messages: [`Marca "${brandName}" ya existía`] });
            }
            if (!p.brand_id) patch.brand_id = brandId;
            if (!p.brand) patch.brand = brandName;
          } else {
            brandSuggestion = { name: brandName, confidence };
            updateRow(p.id, { messages: [`Marca sugerida: ${brandName} (confianza ${(confidence * 100).toFixed(0)}%) — sin crear`] });
          }
        }
      } catch (e: any) {
        updateRow(p.id, { messages: [`Marca IA: ${e?.message ?? "error"}`] });
      }
    }

    // 4) Image optimization (white bg ecommerce)
    if (opts.optimize_image && (p.main_image || mainImage)) {
      try {
        const { data, error } = await supabase.functions.invoke("product-image-edit", {
          body: { image_url: mainImage || p.main_image, background: "white_ecommerce" },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const rawDataUrl = (data as any).image as string;
        // Client-side: normalize framing + WebP @ ~250KB
        const { blob } = await optimizeForCatalog(rawDataUrl, {
          format: "image/webp",
          size: 1200,
          quality: 0.86,
          targetKB: 250,
          hardLimitKB: 400,
          normalizeFrame: true,
          productFill: 0.78,
          backgroundColor: "#FFFFFF",
          whiteBackground: true,
        });
        const url = await uploadBlob(blob, `bulk-ai-${p.id.slice(0, 8)}`, "webp");
        patch.main_image = url;
        mainImage = url;
        updateRow(p.id, { messages: ["Imagen optimizada (WebP)"] });
      } catch (e: any) {
        updateRow(p.id, { messages: [`Imagen IA: ${e?.message ?? "error"}`] });
      }
    }

    // 5) Apply product update
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("products").update(patch as any).eq("id", p.id);
      if (error) {
        updateRow(p.id, { status: "error", messages: [`Update: ${error.message}`], brand_suggestion: brandSuggestion });
        return;
      }
    }

    // 6) SEO meta upsert
    if (Object.keys(seoPatch).length) {
      try {
        const { error: seoErr } = await supabase
          .from("seo_meta" as any)
          .upsert(
            { entity_type: "product", entity_id: p.id, slug: p.slug, ...seoPatch },
            { onConflict: "entity_type,entity_id" } as any,
          );
        if (seoErr) updateRow(p.id, { messages: [`SEO: ${seoErr.message}`] });
        else updateRow(p.id, { messages: ["SEO actualizado"] });
      } catch (e: any) {
        updateRow(p.id, { messages: [`SEO: ${e?.message ?? "error"}`] });
      }
    }

    // 7) Validate & publish
    const merged = { ...p, ...patch };
    if (!merged.name) reasons.push("Falta nombre");
    if (!merged.price || Number(merged.price) <= 0) reasons.push("Precio inválido");
    if (!Number(merged.stock) || Number(merged.stock) <= 0) reasons.push("Sin stock");
    if (!merged.main_image) reasons.push("Sin imagen");
    if (!merged.category) reasons.push("Sin categoría");
    if (!merged.short_description && !merged.description) reasons.push("Sin descripción");

    const canPublish = reasons.length === 0;
    if (canPublish && (opts.publish_approve || opts.publish_activate)) {
      const pubPatch: Record<string, any> = {};
      if (opts.publish_approve) pubPatch.approval_status = "approved";
      if (opts.publish_activate) pubPatch.is_active = true;
      const { error } = await supabase.from("products").update(pubPatch as any).eq("id", p.id);
      if (error) {
        updateRow(p.id, { status: "error", messages: [`Publicar: ${error.message}`], brand_suggestion: brandSuggestion });
        return;
      }
      updateRow(p.id, { status: "ok", messages: ["Publicado"], brand_suggestion: brandSuggestion });
    } else if (!canPublish) {
      updateRow(p.id, { status: "skipped", messages: [`Sin publicar: ${reasons.join(" · ")}`], brand_suggestion: brandSuggestion });
    } else {
      updateRow(p.id, { status: "ok", brand_suggestion: brandSuggestion });
    }
  };

  const run = async () => {
    setRunning(true);
    setDone(0);
    for (let i = 0; i < products.length; i++) {
      try {
        await processOne(products[i]);
      } catch (e: any) {
        updateRow(products[i].id, { status: "error", messages: [e?.message ?? "error"] });
      }
      setDone(i + 1);
    }
    setRunning(false);
    toast.success("Procesamiento masivo completado");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Completar con IA — {products.length} producto(s)
          </DialogTitle>
          <DialogDescription>
            La IA completa contenido, optimiza la imagen, detecta marca, asigna defaults y publica solo si el producto cumple las validaciones.
            Precio, precio de oferta, proveedor y stock existente nunca se modifican.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <label key={o.key} className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={opts[o.key]}
                onCheckedChange={(v) => setOpts((prev) => ({ ...prev, [o.key]: !!v }))}
                disabled={running}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>

        {(running || done > 0) && (
          <div className="space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{done} / {total} procesados</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-md border max-h-72 overflow-y-auto divide-y text-sm">
            {rows.map((r) => (
              <div key={r.id} className="p-2">
                <div className="flex items-center gap-2">
                  {r.status === "running" && <Loader2 size={14} className="animate-spin" />}
                  {r.status === "ok" && <CheckCircle2 size={14} className="text-emerald-600" />}
                  {r.status === "skipped" && <AlertTriangle size={14} className="text-amber-600" />}
                  {r.status === "error" && <AlertTriangle size={14} className="text-destructive" />}
                  <span className="font-medium truncate">{r.name}</span>
                </div>
                {r.messages.length > 0 && (
                  <ul className="ml-5 mt-1 text-xs text-muted-foreground list-disc">
                    {r.messages.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
                {r.brand_suggestion && (
                  <div className="ml-5 mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Marca sugerida (no creada): {r.brand_suggestion.name} · confianza {(r.brand_suggestion.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>Cerrar</Button>
          <Button variant="dark" onClick={run} disabled={running || products.length === 0}>
            {running ? <><Loader2 size={14} className="animate-spin mr-1" /> Procesando…</> : <><Sparkles size={14} className="mr-1" /> Ejecutar IA</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
