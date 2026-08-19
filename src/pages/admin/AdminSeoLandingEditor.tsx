// Editor por bloques de una landing SEO (borrador → revisión → publicación).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LANDING_KINDS, landingPath, normalizeSections, type LandingSections, type NamedItem } from "@/lib/seoLanding";
import LandingSeoAiCard from "@/components/admin/LandingSeoAiCard";


type ListKey = "causes" | "symptoms" | "nutrients" | "ingredients" | "related_topics";

const NUTRIENT_SUGGESTIONS = ["Magnesio", "Proteína", "Calcio", "Vitamina D", "Vitamina C", "Omega 3", "Colágeno", "Hierro", "Zinc"];

export default function AdminSeoLandingEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [sections, setSections] = useState<LandingSections>({});
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: prods }] = await Promise.all([
        (supabase as any).from("seo_landing_pages").select("*").eq("id", id).maybeSingle(),
        supabase.from("products").select("id, name, category").eq("is_active", true).order("name").limit(500),
      ]);
      setRow(data ?? null);
      setSections(normalizeSections(data?.sections));
      setFaqs(Array.isArray(data?.faqs) ? data.faqs : []);
      setProductOptions(prods ?? []);
      setLoading(false);
    })();
  }, [id]);

  const set = (patch: Record<string, any>) => setRow((r: any) => ({ ...r, ...patch }));
  const setList = (key: ListKey, items: NamedItem[]) => setSections((s) => ({ ...s, [key]: items }));

  const addItem = (key: ListKey) => setList(key, [...(sections[key] ?? []), { title: "", description: "" }]);
  const removeItem = (key: ListKey, i: number) => setList(key, (sections[key] ?? []).filter((_, x) => x !== i));
  const moveItem = (key: ListKey, i: number, d: -1 | 1) => {
    const items = [...(sections[key] ?? [])];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setList(key, items);
  };
  const patchItem = (key: ListKey, i: number, patch: Partial<NamedItem>) =>
    setList(key, (sections[key] ?? []).map((it, x) => (x === i ? { ...it, ...patch } : it)));

  const manualIds: string[] = useMemo(
    () => (Array.isArray(row?.product_ids) ? row.product_ids : []),
    [row],
  );

  const save = async (extra: Record<string, any> = {}) => {
    setSaving(true);
    const payload = {
      title: row.title, slug: row.slug, kind: row.kind, keyword: row.keyword,
      category_name: row.category_name, hero_image: row.hero_image,
      hero_cta_label: row.hero_cta_label, hero_cta_href: row.hero_cta_href,
      meta_title: row.meta_title, meta_description: row.meta_description,
      canonical: row.canonical, noindex: !!row.noindex,
      og_title: row.og_title, og_description: row.og_description, og_image: row.og_image,
      intro: row.intro, body_html: row.body_html, long_description: row.long_description,
      filter_field: row.filter_field, filter_value: row.filter_value,
      products_mode: row.products_mode ?? "auto", product_ids: manualIds,
      sections, faqs,
      schema_jsonld: faqs.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }
        : row.schema_jsonld,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await (supabase as any).from("seo_landing_pages").update(payload).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Guardado"); setRow((r: any) => ({ ...r, ...payload })); }
  };

  const togglePublish = async () => {
    const next = !row.is_published;
    await save({ is_published: next, status: next ? "published" : "draft" });
  };

  if (loading) return <div className="p-8 text-muted-foreground">Cargando…</div>;
  if (!row) return <div className="p-8">Landing no encontrada. <Link className="text-accent" to="/admin/ia-landings">Volver</Link></div>;

  const isHealth = row.kind === "problema";

  const ListEditor = ({ title, k, withIcon }: { title: string; k: ListKey; withIcon?: boolean }) => (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => addItem(k)}><Plus size={14} /> Agregar</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(sections[k] ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin elementos.</p>}
        {(sections[k] ?? []).map((it, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr,2fr,auto]">
            <Input
              value={it.title ?? it.name ?? ""}
              placeholder="Título"
              onChange={(e) => patchItem(k, i, { title: e.target.value, name: e.target.value })}
            />
            <Input
              value={it.description ?? ""}
              placeholder="Descripción"
              onChange={(e) => patchItem(k, i, { description: e.target.value })}
            />
            <div className="flex items-center gap-1">
              {withIcon && (
                <Input className="w-24" value={it.icon ?? ""} placeholder="icono" onChange={(e) => patchItem(k, i, { icon: e.target.value })} />
              )}
              <Button size="icon" variant="ghost" onClick={() => moveItem(k, i, -1)}><ArrowUp size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => moveItem(k, i, 1)}><ArrowDown size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => removeItem(k, i)}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
        {k === "nutrients" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {NUTRIENT_SUGGESTIONS.map((n) => (
              <Button key={n} size="sm" variant="secondary" onClick={() => setList("nutrients", [...(sections.nutrients ?? []), { title: n, description: "" }])}>
                + {n}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => nav("/admin/ia-landings")}><ArrowLeft size={16} /></Button>
          <h1 className="font-display text-2xl">{row.title}</h1>
          <Badge variant={row.is_published ? "default" : "secondary"}>{row.is_published ? "Publicado" : "Borrador"}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={landingPath(row.kind, row.slug)} target="_blank"><ExternalLink size={14} /> Ver</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={togglePublish} disabled={saving}>
            {row.is_published ? "Despublicar" : "Publicar"}
          </Button>
          <Button size="sm" onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><Label>Palabra clave</Label><Input value={row.keyword ?? ""} onChange={(e) => set({ keyword: e.target.value })} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={row.kind} onValueChange={(v) => set({ kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANDING_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Categoría relacionada</Label><Input value={row.category_name ?? ""} onChange={(e) => set({ category_name: e.target.value })} /></div>
          <div><Label>Nombre (H1)</Label><Input value={row.title ?? ""} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={row.slug ?? ""} onChange={(e) => set({ slug: e.target.value })} /></div>
          <div><Label>Imagen principal (URL)</Label><Input value={row.hero_image ?? ""} onChange={(e) => set({ hero_image: e.target.value })} /></div>
          <div><Label>ALT de la imagen principal</Label><Input value={row.hero_image_alt ?? ""} placeholder="Alimentación saludable y vitaminas" onChange={(e) => set({ hero_image_alt: e.target.value })} /></div>
          {row.hero_image && (
            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-border p-3">
              <img src={row.hero_image} alt={row.hero_image_alt || row.title || ""} className="h-24 w-24 rounded-xl object-cover" />
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground">{row.category_name || "Categoría"}</p>
                <p className="font-display text-base text-foreground">{row.title}</p>
                <p className="line-clamp-2">{row.intro}</p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><Label>SEO title</Label><Input value={row.meta_title ?? ""} onChange={(e) => set({ meta_title: e.target.value })} /></div>
          <div><Label>Canonical</Label><Input value={row.canonical ?? ""} onChange={(e) => set({ canonical: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Meta description</Label><Textarea value={row.meta_description ?? ""} onChange={(e) => set({ meta_description: e.target.value })} /></div>
          <div><Label>OG title</Label><Input value={row.og_title ?? ""} onChange={(e) => set({ og_title: e.target.value })} /></div>
          <div><Label>OG image</Label><Input value={row.og_image ?? ""} onChange={(e) => set({ og_image: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>OG description</Label><Textarea value={row.og_description ?? ""} onChange={(e) => set({ og_description: e.target.value })} /></div>
          <div className="flex items-center gap-3"><Switch checked={!!row.noindex} onCheckedChange={(v) => set({ noindex: v })} /><Label>No indexar (noindex)</Label></div>
        </CardContent>
      </Card>

      <LandingSeoAiCard
        landingId={id!}
        row={row}
        faqs={faqs}
        onApply={(patch) => set(patch)}
        onApplyFaqs={(f) => setFaqs(f)}
      />



      <Card>
        <CardHeader><CardTitle className="text-base">Hero e introducción</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><Label>Texto del CTA</Label><Input value={row.hero_cta_label ?? ""} placeholder="Ver productos relacionados" onChange={(e) => set({ hero_cta_label: e.target.value })} /></div>
          <div><Label>Enlace del CTA (opcional)</Label><Input value={row.hero_cta_href ?? ""} onChange={(e) => set({ hero_cta_href: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Descripción corta / introducción</Label><Textarea rows={3} value={row.intro ?? ""} onChange={(e) => set({ intro: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Contenido principal (HTML)</Label><Textarea rows={8} value={row.body_html ?? ""} onChange={(e) => set({ body_html: e.target.value })} /></div>
        </CardContent>
      </Card>

      {isHealth && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Qué es</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Título" value={sections.what_is?.title ?? ""} onChange={(e) => setSections((s) => ({ ...s, what_is: { ...s.what_is, title: e.target.value } }))} />
              <Textarea rows={5} value={sections.what_is?.content ?? ""} onChange={(e) => setSections((s) => ({ ...s, what_is: { ...s.what_is, content: e.target.value } }))} />
            </CardContent>
          </Card>

          <ListEditor title="Causas" k="causes" withIcon />
          <ListEditor title="Síntomas relacionados" k="symptoms" />

          <Card>
            <CardHeader><CardTitle className="text-base">Qué hacer</CardTitle></CardHeader>
            <CardContent><Textarea rows={6} value={sections.what_to_do ?? ""} onChange={(e) => setSections((s) => ({ ...s, what_to_do: e.target.value }))} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Alimentación</CardTitle></CardHeader>
            <CardContent><Textarea rows={6} value={sections.nutrition ?? ""} onChange={(e) => setSections((s) => ({ ...s, nutrition: e.target.value }))} /></CardContent>
          </Card>
        </>
      )}

      <ListEditor title="Nutrientes relacionados" k="nutrients" />
      <ListEditor title="Ingredientes relacionados" k="ingredients" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos relacionados</CardTitle>
          <CardDescription>En automático se usan los filtros de catálogo; en manual eliges los productos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Modo</Label>
              <Select value={row.products_mode ?? "auto"} onValueChange={(v) => set({ products_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Campo de filtro</Label><Input value={row.filter_field ?? ""} onChange={(e) => set({ filter_field: e.target.value })} /></div>
            <div><Label>Valor de filtro</Label><Input value={row.filter_value ?? ""} onChange={(e) => set({ filter_value: e.target.value })} /></div>
          </div>

          {(row.products_mode ?? "auto") === "manual" && (
            <div className="space-y-3">
              <Select value="" onValueChange={(v) => { if (!manualIds.includes(v)) set({ product_ids: [...manualIds, v] }); }}>
                <SelectTrigger><SelectValue placeholder="Agregar producto…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {productOptions.filter((p) => !manualIds.includes(p.id)).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {manualIds.map((pid, i) => {
                const p = productOptions.find((x) => x.id === pid);
                return (
                  <div key={pid} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                    <span>{i + 1}. {p?.name ?? pid}</span>
                    <span className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        const a = [...manualIds]; if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ product_ids: a }); }
                      }}><ArrowUp size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        const a = [...manualIds]; if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; set({ product_ids: a }); }
                      }}><ArrowDown size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => set({ product_ids: manualIds.filter((x) => x !== pid) })}><Trash2 size={14} /></Button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ListEditor title="Temas relacionados (otras landings de salud)" k="related_topics" />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setFaqs([...faqs, { q: "", a: "" }])}><Plus size={14} /> Agregar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.length === 0 && <p className="text-sm text-muted-foreground">Sin preguntas.</p>}
          {faqs.map((f, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <Input value={f.q} placeholder="Pregunta" onChange={(e) => setFaqs(faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
                <Button size="icon" variant="ghost" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
              </div>
              <Textarea value={f.a} placeholder="Respuesta" onChange={(e) => setFaqs(faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
            </div>
          ))}
        </CardContent>
      </Card>

      {isHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuándo consultar a un profesional</CardTitle>
            <CardDescription>Bloque obligatorio en landings de tipo Problema / Necesidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} value={sections.professional_help ?? ""} onChange={(e) => setSections((s) => ({ ...s, professional_help: e.target.value }))} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Texto de cierre</CardTitle></CardHeader>
        <CardContent><Textarea rows={4} value={row.long_description ?? ""} onChange={(e) => set({ long_description: e.target.value })} /></CardContent>
      </Card>
    </div>
  );
}
