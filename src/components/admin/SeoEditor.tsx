import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, ChevronDown, ChevronUp, X, Sparkles, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import { computeSeoScore, scoreBadgeClass, computeProductSeoScore, type ProductSeoField } from "@/lib/seoScore";
import { slugify } from "@/lib/slug";
import type { SeoEntityType, SeoMetaRow } from "@/hooks/useSeoMeta";
import { SeoAiSuggestionDialog } from "@/components/admin/SeoAiSuggestionDialog";

type Props = {
  entityType: SeoEntityType;
  entityId: string | null;        // can be null until entity is saved
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackSlug?: string;
  images?: string[];               // for alt editor
  productName?: string;            // helps the product 100/100 rubric
};

const empty: Partial<SeoMetaRow> = {
  seo_title: "", seo_description: "", slug: "",
  keywords: [], tags: [],
  og_image: "", canonical: "",
  shopping_title: "", shopping_description: "",
  short_description: "", long_description: "",
  noindex: false,
};

export const SeoEditor = ({ entityType, entityId, fallbackTitle, fallbackDescription, fallbackSlug, images = [], productName }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<Partial<SeoMetaRow>>(empty);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const [kwInput, setKwInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiFaqs, setAiFaqs] = useState<{ question: string; answer: string }[] | null>(null);



  useEffect(() => {
    if (!entityId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [{ data: meta }, { data: altRows }] = await Promise.all([
        supabase.from("seo_meta" as any).select("*").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle(),
        supabase.from("seo_image_alts" as any).select("image_url, alt_text").eq("entity_type", entityType).eq("entity_id", entityId),
      ]);
      if (!alive) return;
      setF((meta as any) ?? { ...empty });
      const m: Record<string, string> = {};
      ((altRows as any[]) ?? []).forEach((r) => { m[r.image_url] = r.alt_text; });
      setAlts(m);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [entityType, entityId]);

  const set = (k: keyof SeoMetaRow, v: any) => setF((p) => ({ ...p, [k]: v }));

  const title = f.seo_title || fallbackTitle || "";
  const desc = f.seo_description || fallbackDescription || "";
  const slug = f.slug || fallbackSlug || "";

  const imagesWithAlt = images.filter((u) => (alts[u] ?? "").trim().length > 0).length;
  const { score, issues } = computeSeoScore({
    title, description: desc, slug,
    keywords: f.keywords ?? [],
    ogImage: f.og_image ?? null,
    imagesWithAlt, imagesTotal: images.length,
    hasJsonLd: false,
    hasShortDescription: !!(f.short_description ?? "").trim(),
    hasLongDescription: !!(f.long_description ?? "").trim(),
  });

  const save = async () => {
    if (!entityId) { toast.error("Guarda primero la entidad para poder asociar SEO"); return; }
    setSaving(true);
    try {
      const payload: any = {
        entity_type: entityType,
        entity_id: entityId,
        seo_title: f.seo_title || null,
        seo_description: f.seo_description || null,
        slug: f.slug || null,
        keywords: f.keywords ?? [],
        tags: f.tags ?? [],
        og_image: f.og_image || null,
        canonical: f.canonical || null,
        shopping_title: f.shopping_title || null,
        shopping_description: f.shopping_description || null,
        short_description: f.short_description || null,
        long_description: f.long_description || null,
        noindex: !!f.noindex,
        score,
        last_analyzed_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("seo_meta" as any).upsert(payload, { onConflict: "entity_type,entity_id" });
      if (error) throw error;

      // alts
      const altUpserts = Object.entries(alts)
        .filter(([, v]) => (v ?? "").trim().length > 0)
        .map(([image_url, alt_text]) => ({ entity_type: entityType, entity_id: entityId, image_url, alt_text }));
      if (altUpserts.length) {
        const { error: e2 } = await supabase.from("seo_image_alts" as any).upsert(altUpserts, { onConflict: "entity_type,entity_id,image_url" });
        if (e2) throw e2;
      }

      // FAQs into schema_jsonld
      if (aiFaqs && aiFaqs.length > 0) {
        const faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: aiFaqs.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: { "@type": "Answer", text: q.answer },
          })),
        };
        await supabase.from("seo_meta" as any).update({ schema_jsonld: faqSchema }).eq("entity_type", entityType).eq("entity_id", entityId);
      }

      toast.success("SEO guardado");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const applySuggestion = (patch: Record<string, any>, newAlts: Record<string, string>, faqs: { question: string; answer: string }[]) => {
    setF((p) => ({ ...p, ...patch }));
    if (Object.keys(newAlts).length) setAlts((p) => ({ ...p, ...newAlts }));
    if (faqs.length) setAiFaqs(faqs);
  };

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v) return;
    const arr = Array.from(new Set([...(f.keywords ?? []), v]));
    set("keywords", arr);
    setKwInput("");
  };
  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    const arr = Array.from(new Set([...(f.tags ?? []), v]));
    set("tags", arr);
    setTagInput("");
  };

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-display text-lg">SEO Inteligente</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(score)}`}>{score}/100</span>
          {!entityId && <span className="text-xs text-muted-foreground">(guarda primero para activar)</span>}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Cargando…</div>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAiOpen(true)} disabled={!entityId}>
              <Sparkles size={14} /> Generar SEO con IA
            </Button>
            {aiFaqs && <span className="text-xs text-emerald-600">{aiFaqs.length} FAQs listas para guardar</span>}
          </div>

          {/* Google snippet preview */}
          <div className="rounded-md border bg-secondary/30 p-3">
            <div className="truncate text-[13px] text-emerald-700 dark:text-emerald-400">
              https://ignite-peak-co.lovable.app/{slug || "…"}
            </div>
            <div className="truncate text-base text-blue-700 dark:text-blue-400">{title || "Título SEO…"}</div>
            <div className="line-clamp-2 text-sm text-muted-foreground">{desc || "Meta descripción…"}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Título SEO ({(title).length}/60)</Label>
              <Input value={f.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} placeholder={fallbackTitle} />
            </div>
            <div className="sm:col-span-2">
              <Label>Meta descripción ({(desc).length}/160)</Label>
              <Textarea rows={2} value={f.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} placeholder={fallbackDescription} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={f.slug ?? ""} onChange={(e) => set("slug", e.target.value)} onBlur={(e) => set("slug", slugify(e.target.value))} placeholder={fallbackSlug} />
            </div>
            <div>
              <Label>Canonical URL</Label>
              <Input value={f.canonical ?? ""} onChange={(e) => set("canonical", e.target.value)} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Imagen para compartir (OG)</Label>
              <Input value={f.og_image ?? ""} onChange={(e) => set("og_image", e.target.value)} placeholder="https://…/imagen.jpg" />
            </div>

            <div className="sm:col-span-2">
              <Label>Palabras clave</Label>
              <div className="flex gap-2">
                <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} placeholder="Enter para agregar" />
                <Button type="button" variant="outline" onClick={addKeyword}>Agregar</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(f.keywords ?? []).map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1">{k}
                    <button type="button" onClick={() => set("keywords", (f.keywords ?? []).filter((x) => x !== k))}><X size={10} /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Enter para agregar" />
                <Button type="button" variant="outline" onClick={addTag}>Agregar</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(f.tags ?? []).map((k) => (
                  <Badge key={k} variant="outline" className="gap-1">{k}
                    <button type="button" onClick={() => set("tags", (f.tags ?? []).filter((x) => x !== k))}><X size={10} /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Título Google Shopping (máx 150)</Label>
              <Input value={f.shopping_title ?? ""} onChange={(e) => set("shopping_title", e.target.value)} />
            </div>
            <div>
              <Label>Descripción Google Shopping</Label>
              <Input value={f.shopping_description ?? ""} onChange={(e) => set("shopping_description", e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <Label>Descripción corta</Label>
              <Textarea rows={2} value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descripción larga</Label>
              <Textarea rows={5} value={f.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={!!f.noindex} onCheckedChange={(v) => set("noindex", v)} />
              <Label>No indexar (noindex)</Label>
            </div>
          </div>

          {images.length > 0 && (
            <div className="space-y-2">
              <Label>Alt text por imagen</Label>
              <div className="space-y-2">
                {images.map((url) => (
                  <div key={url} className="flex items-center gap-3 rounded-md border p-2">
                    <img src={url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                    <Input
                      value={alts[url] ?? ""}
                      onChange={(e) => setAlts((p) => ({ ...p, [url]: e.target.value }))}
                      placeholder="Describe la imagen para SEO y accesibilidad"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {issues.length > 0 && (
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sugerencias</div>
              <ul className="space-y-1 text-sm">
                {issues.map((i, idx) => (
                  <li key={idx} className={i.level === "error" ? "text-destructive" : i.level === "warn" ? "text-amber-600" : "text-muted-foreground"}>
                    • {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="dark" onClick={save} disabled={saving || !entityId}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar SEO
            </Button>
          </div>
        </div>
      )}

      {entityId && (
        <SeoAiSuggestionDialog
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          entityType={entityType}
          entityId={entityId}
          current={f}
          onApply={applySuggestion}
        />
      )}
    </div>
  );
};
