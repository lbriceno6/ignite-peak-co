import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Sparkles, Image as ImageIcon, Trash2, RefreshCw, Eye, Loader2, ExternalLink } from "lucide-react";
import { slugify } from "@/lib/slug";

type Status = "pending" | "reviewed" | "imported" | "discarded" | "error";

type ImportedProduct = {
  id: string;
  job_id: string | null;
  source_url: string;
  source_domain: string | null;
  original_title: string | null;
  original_description: string | null;
  original_price: number | null;
  original_sale_price: number | null;
  original_currency: string | null;
  original_image_url: string | null;
  original_gallery_urls: string[] | null;
  detected_brand: string | null;
  detected_category: string | null;
  detected_stock: string | null;
  ai_rewritten_title: string | null;
  ai_rewritten_description: string | null;
  ai_long_description: string | null;
  ai_meta_title: string | null;
  ai_meta_description: string | null;
  ai_category_suggestion: string | null;
  ai_intent_suggestion: string | null;
  ai_benefits: unknown;
  ai_keywords: unknown;
  ai_ingredients: unknown;
  stored_image_url: string | null;
  status: Status;
  created_product_id: string | null;
  created_at: string;
};

type Job = {
  id: string;
  source_url: string;
  source_domain: string | null;
  mode: string;
  products_found: number;
  products_imported: number;
  status: string;
  error_message: string | null;
  created_at: string;
};

const INTENT_KEYWORDS: Record<string, string> = {
  "colágeno": "colageno", "colageno": "colageno",
  "maca": "energia", "energ": "energia", "guarana": "energia",
  "omega": "bienestar", "vitamina": "bienestar",
  "proteína": "fitness", "proteina": "fitness", "whey": "fitness",
  "creatina": "masa_muscular",
};

function suggestIntent(p: ImportedProduct): string | null {
  if (p.ai_intent_suggestion) return p.ai_intent_suggestion;
  const text = `${p.original_title || ""} ${p.original_description || ""}`.toLowerCase();
  for (const k of Object.keys(INTENT_KEYWORDS)) if (text.includes(k)) return INTENT_KEYWORDS[k];
  return null;
}

export default function AdminWebImporter() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"auto" | "category" | "product">("auto");
  const [loading, setLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ImportedProduct | null>(null);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);

  const refresh = async () => {
    const q = supabase.from("imported_products").select("*").order("created_at", { ascending: false }).limit(200);
    const [{ data: ips }, { data: js }, { data: cats }] = await Promise.all([
      q,
      supabase.from("web_import_jobs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("categories").select("slug,name").eq("is_active", true).order("name"),
    ]);
    setProducts((ips || []) as unknown as ImportedProduct[]);
    setJobs((js || []) as Job[]);
    setCategories((cats || []) as { slug: string; name: string }[]);
  };

  useEffect(() => { refresh(); }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) { toast.error("Pega una URL"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("web-product-importer", { body: { url: url.trim(), mode } });
      if (error) throw error;
      const found = (data as { products_found: number; job_id: string; error?: string }).products_found;
      const err = (data as { error?: string }).error;
      setCurrentJobId((data as { job_id: string }).job_id);
      if (err) toast.error(err); else toast.success(`Encontrados ${found} productos`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async (id: string) => {
    setAiBusy(id);
    try {
      const { error } = await supabase.functions.invoke("web-product-rewrite", { body: { imported_product_id: id } });
      if (error) throw error;
      toast.success("Reescrito con IA");
      await refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setAiBusy(null); }
  };

  const handleSaveImage = async (id: string) => {
    setAiBusy(id);
    try {
      const { error } = await supabase.functions.invoke("web-product-save-image", { body: { imported_product_id: id } });
      if (error) throw error;
      toast.success("Imagen guardada en Storage");
      await refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setAiBusy(null); }
  };

  const handleDiscard = async (ids: string[]) => {
    if (ids.length === 0) return;
    await supabase.from("imported_products").update({ status: "discarded" }).in("id", ids);
    setSelected(new Set());
    await refresh();
  };

  const handleImport = async (ids: string[]) => {
    if (ids.length === 0) { toast.error("Selecciona al menos uno"); return; }
    const toImport = products.filter((p) => ids.includes(p.id) && p.status !== "imported");
    let ok = 0, skipped = 0;
    for (const p of toImport) {
      const name = (p.ai_rewritten_title || p.original_title || "").trim();
      if (!name) { skipped++; continue; }
      const baseSlug = slugify(name).slice(0, 60);
      let slug = baseSlug;
      // Try unique slug (append -2, -3...)
      for (let i = 2; i < 20; i++) {
        const { data: exists } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
        if (!exists) break;
        slug = `${baseSlug}-${i}`;
      }
      const { data: created, error } = await supabase.from("products").insert({
        name,
        slug,
        short_description: p.ai_rewritten_description || p.original_description?.slice(0, 240) || null,
        description: p.ai_long_description || p.original_description || null,
        price: p.original_price ?? 0,
        sale_price: p.original_sale_price ?? null,
        main_image: p.stored_image_url || p.original_image_url || null,
        gallery_images: p.original_gallery_urls || [],
        category: p.ai_category_suggestion || p.detected_category || null,
        brand: p.detected_brand || null,
        is_active: false,
        approval_status: "pending",
        stock: 0,
        source_url: p.source_url || null,
        source_domain: p.source_domain || null,
      } as never).select("id").single();
      if (error) { skipped++; continue; }
      await supabase.from("imported_products").update({ status: "imported", created_product_id: created.id }).eq("id", p.id);
      ok++;
    }
    if (ok > 0) {
      toast.success(
        `Importados ${ok}${skipped ? `, omitidos ${skipped}` : ""} como borradores. Para publicarlos debes activarlos, aprobarlos y asignar stock.`,
        {
          duration: 8000,
          action: {
            label: "Revisar borradores",
            onClick: () => { window.location.href = "/admin/products?filter=drafts"; },
          },
        },
      );
    } else if (skipped > 0) {
      toast.error(`No se importó nada. Omitidos: ${skipped}`);
    }
    setSelected(new Set());
    await refresh();
  };

  const visible = products.filter((p) => {
    if (currentJobId && p.job_id !== currentJobId) return false;
    return true;
  });

  const visibleHistory = jobs.filter((j) => {
    if (filterDomain && !(j.source_domain || "").includes(filterDomain)) return false;
    if (filterStatus && j.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl">Importador Web Inteligente</h1>
          <p className="text-sm text-muted-foreground">Pega una URL, analiza productos y revisa antes de publicar. Nada se publica automáticamente.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/products?filter=drafts">Revisar borradores</a>
        </Button>
      </header>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Uso responsable</AlertTitle>
        <AlertDescription>
          Usa esta herramienta solo con sitios donde tengas permiso para extraer información. Revisa derechos de imágenes, marcas y descripciones antes de publicar.
        </AlertDescription>
      </Alert>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ejemplo.com/categoria/proteinas" />
          </div>
          <div>
            <Label className="text-xs">Modo</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detección automática</SelectItem>
                <SelectItem value="category">Página de categoría</SelectItem>
                <SelectItem value="product">Producto individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAnalyze} disabled={loading} className="w-full md:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analizar web
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Resultados ({visible.length})</TabsTrigger>
          <TabsTrigger value="history">Historial ({jobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCurrentJobId(null)}>Ver todos los importados</Button>
            <Button size="sm" onClick={() => handleImport(Array.from(selected))} disabled={selected.size === 0}>
              Importar seleccionados como borrador
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDiscard(Array.from(selected))} disabled={selected.size === 0}>
              <Trash2 className="mr-1 h-3 w-3" /> Descartar seleccionados
            </Button>
            <span className="text-xs text-muted-foreground">{selected.size} seleccionados</span>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-16">Img</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Marca / Cat.</TableHead>
                  <TableHead>Intención</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">Sin resultados. Analiza una URL para empezar.</TableCell></TableRow>
                )}
                {visible.map((p) => {
                  const intent = suggestIntent(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(p.id); else next.delete(p.id);
                          setSelected(next);
                        }} />
                      </TableCell>
                      <TableCell>
                        {(p.stored_image_url || p.original_image_url) ? (
                          <img src={p.stored_image_url || p.original_image_url || ""} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : <div className="h-10 w-10 rounded bg-muted" />}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">{p.ai_rewritten_title || p.original_title || "(sin título)"}</div>
                        <a href={p.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
                          {p.source_domain} <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.original_price ? `${p.original_currency || ""} ${p.original_price}` : "—"}
                        {p.original_sale_price ? <div className="text-xs text-accent">Oferta: {p.original_sale_price}</div> : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{p.detected_brand || "—"}</div>
                        <div className="text-muted-foreground">{p.ai_category_suggestion || p.detected_category || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">{intent || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setDetail(p)} title="Ver detalle"><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleRewrite(p.id)} disabled={aiBusy === p.id} title="Reescribir con IA">
                            {aiBusy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleSaveImage(p.id)} disabled={aiBusy === p.id || !p.original_image_url} title="Guardar imagen en mi Storage">
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDiscard([p.id])} title="Descartar"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Filtrar por dominio" value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="max-w-xs" />
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="running">En curso</SelectItem>
                <SelectItem value="done">Listo</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Dominio</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Encontrados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleHistory.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">Sin historial</TableCell></TableRow>
                )}
                {visibleHistory.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="max-w-md truncate"><a href={j.source_url} target="_blank" rel="noreferrer" className="hover:underline">{j.source_url}</a></TableCell>
                    <TableCell>{j.source_domain}</TableCell>
                    <TableCell>{j.mode}</TableCell>
                    <TableCell>{j.products_found}</TableCell>
                    <TableCell><Badge variant={j.status === "error" ? "destructive" : "outline"}>{j.status}</Badge>{j.error_message ? <div className="text-xs text-muted-foreground mt-1">{j.error_message}</div> : null}</TableCell>
                    <TableCell className="text-xs">{new Date(j.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setCurrentJobId(j.id); }} title="Ver productos"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        setUrl(j.source_url); setMode(j.mode as typeof mode);
                      }} title="Reanalizar"><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        await supabase.from("web_import_jobs").delete().eq("id", j.id);
                        await refresh();
                      }} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader><SheetTitle>Detalle del producto importado</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                {(detail.stored_image_url || detail.original_image_url) && (
                  <img src={detail.stored_image_url || detail.original_image_url || ""} alt="" className="max-h-64 rounded object-contain border" />
                )}
                <FieldRow label="Título IA" value={detail.ai_rewritten_title} onChange={(v) => updateField(detail.id, "ai_rewritten_title", v, setDetail, refresh)} />
                <FieldRow label="Título original" value={detail.original_title} readOnly />
                <FieldRow label="Descripción corta IA" value={detail.ai_rewritten_description} onChange={(v) => updateField(detail.id, "ai_rewritten_description", v, setDetail, refresh)} textarea />
                <FieldRow label="Descripción larga IA" value={detail.ai_long_description} onChange={(v) => updateField(detail.id, "ai_long_description", v, setDetail, refresh)} textarea />
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Precio" value={detail.original_price?.toString() || ""} readOnly />
                  <FieldRow label="Moneda" value={detail.original_currency} readOnly />
                </div>
                <FieldRow label="Marca detectada" value={detail.detected_brand} readOnly />
                <div>
                  <Label className="text-xs">Categoría sugerida</Label>
                  <Select value={detail.ai_category_suggestion || detail.detected_category || ""} onValueChange={(v) => updateField(detail.id, "ai_category_suggestion", v, setDetail, refresh)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldRow label="Intención sugerida" value={detail.ai_intent_suggestion} onChange={(v) => updateField(detail.id, "ai_intent_suggestion", v, setDetail, refresh)} />
                <FieldRow label="Meta title" value={detail.ai_meta_title} onChange={(v) => updateField(detail.id, "ai_meta_title", v, setDetail, refresh)} />
                <FieldRow label="Meta description" value={detail.ai_meta_description} onChange={(v) => updateField(detail.id, "ai_meta_description", v, setDetail, refresh)} textarea />
                <div className="text-xs text-muted-foreground">URL: <a href={detail.source_url} target="_blank" rel="noreferrer" className="underline">{detail.source_url}</a></div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button size="sm" onClick={() => handleRewrite(detail.id)} disabled={aiBusy === detail.id}>
                    <Sparkles className="mr-1 h-4 w-4" /> Reescribir con IA
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSaveImage(detail.id)} disabled={!detail.original_image_url}>
                    <ImageIcon className="mr-1 h-4 w-4" /> Guardar imagen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleImport([detail.id])}>Importar como borrador</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Verifica que tienes permiso para usar esta imagen y este contenido antes de publicarlo.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

async function updateField(
  id: string,
  field: string,
  value: string,
  setDetail: (p: ImportedProduct | null) => void,
  refresh: () => Promise<void>,
) {
  await supabase.from("imported_products").update({ [field]: value } as never).eq("id", id);
  const { data } = await supabase.from("imported_products").select("*").eq("id", id).single();
  if (data) setDetail(data as unknown as ImportedProduct);
  await refresh();
}

function FieldRow({ label, value, onChange, readOnly, textarea }: {
  label: string;
  value: string | null | undefined;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {textarea ? (
        <Textarea value={value || ""} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} rows={3} />
      ) : (
        <Input value={value || ""} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly} />
      )}
    </div>
  );
}
