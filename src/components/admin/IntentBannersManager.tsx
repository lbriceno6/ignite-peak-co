import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, ArrowRight, Save, RefreshCw, Upload, Trash2, Image as ImageIcon,
  Activity, Eraser, ExternalLink,
} from "lucide-react";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
  type BrowseSignal,
} from "@/lib/userPersonalization";
import { getLocalBrowseSignals, getRecentlyViewedSlugsLocal } from "@/lib/recoEvents";

export type IntentBanner = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  banner_image: string | null;
  cta_text: string | null;
  cta_url: string | null;
  priority: number;
  is_active: boolean;
  keywords?: string[] | null;
  category_slugs?: string[] | null;
  product_ids?: string[] | null;
};

const INITIAL_SLUGS = [
  "energia", "digestion", "control_peso", "articulaciones", "colageno",
  "masa_muscular", "fitness", "defensas", "piel_cabello_unas", "bienestar_general",
];

async function uploadIntentImage(file: File, slug: string): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/avif"];
  if (!allowed.includes(file.type)) throw new Error("Solo JPG, PNG, WebP o AVIF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `intent-banners/${slug}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
}

function BannerPreview({ b }: { b: Partial<IntentBanner> }) {
  const title = b.title || "Recomendado para ti";
  const subtitle = b.subtitle || "";
  const eyebrow = b.eyebrow || "Recomendado para ti";
  const ctaLabel = b.cta_text || "Ver productos";
  const ctaHref = b.cta_url || "/productos";
  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900 text-white">
      {b.banner_image && (
        <img src={b.banner_image} alt={title}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/75 to-transparent" />
      <div className="relative grid min-h-[200px] items-center p-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-bold">
            <Sparkles size={12} /> {eyebrow}
          </span>
          <h3 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">{title}</h3>
          {subtitle && <p className="mt-2 text-sm text-white/75">{subtitle}</p>}
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900">
            {ctaLabel} <ArrowRight size={14} />
          </div>
          <div className="mt-2 text-[11px] text-white/60">URL: {ctaHref}</div>
        </div>
      </div>
    </div>
  );
}

function ImageField({
  value,
  slug,
  onChange,
}: {
  value: string | null;
  slug: string;
  onChange: (next: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadIntentImage(file, slug);
      onChange(url);
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e.message || "Error subiendo imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <Label className="text-xs">Imagen de fondo</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded border bg-muted/40">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 min-w-[180px]">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline"
              onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3 w-3 mr-1" />
              {uploading ? "Subiendo…" : value ? "Reemplazar" : "Subir imagen"}
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
                <Trash2 className="h-3 w-3 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <Input
            value={value ?? ""}
            placeholder="O pega una URL pública…"
            onChange={(e) => onChange(e.target.value || null)}
          />
          <p className="text-[11px] text-muted-foreground">
            JPG, PNG, WebP o AVIF. Máx 5 MB. La imagen se guarda en Storage y se muestra en el Home.
          </p>
        </div>
      </div>
    </div>
  );
}

export function IntentBannersManager() {
  const [list, setList] = useState<IntentBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("purchase_intents")
      .select("id,slug,name,eyebrow,title,subtitle,banner_image,cta_text,cta_url,priority,is_active,keywords,category_slugs,product_ids")
      .order("priority");
    setList((data ?? []) as IntentBanner[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<IntentBanner>) => {
    setList((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const save = async (it: IntentBanner) => {
    setSavingId(it.id);
    const { error } = await (supabase as any)
      .from("purchase_intents")
      .update({
        eyebrow: it.eyebrow,
        title: it.title,
        subtitle: it.subtitle,
        banner_image: it.banner_image,
        cta_text: it.cta_text,
        cta_url: it.cta_url,
        priority: it.priority,
        is_active: it.is_active,
      })
      .eq("id", it.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Banner de "${it.name}" guardado`);
  };

  const seedMissing = async () => {
    const existing = new Set(list.map((i) => i.slug));
    const missing = INITIAL_SLUGS.filter((s) => !existing.has(s));
    if (missing.length === 0) {
      toast.info("Todas las intenciones iniciales ya existen.");
      return;
    }
    const rows = missing.map((slug, idx) => ({
      slug, name: slug.replace(/_/g, " "), is_active: true, priority: 200 + idx,
    }));
    const { error } = await (supabase as any).from("purchase_intents").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Se crearon ${missing.length} intenciones faltantes.`);
    load();
  };

  return (
    <div className="rounded-md border bg-background p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">Banners por intención</h4>
          <p className="text-[11px] text-muted-foreground">
            Define exactamente qué banner aparece cuando la IA detecta cada intención. Puedes subir imágenes o pegar una URL.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> Recargar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={seedMissing}>
            + Intenciones base
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Cargando intenciones…</div>
      ) : (
        <div className="space-y-2">
          {list.map((it) => {
            const isOpen = expanded === it.id;
            return (
              <Card key={it.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : it.id)}
                  className="w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded border bg-muted/40">
                      {it.banner_image ? (
                        <img src={it.banner_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{it.name}</span>
                        <code className="text-[10px] text-muted-foreground">/{it.slug}</code>
                        {!it.is_active && (
                          <span className="text-[10px] rounded bg-muted px-1.5 py-0.5">inactivo</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {it.title || <em>Sin título</em>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={it.is_active}
                      onCheckedChange={(v) => { update(it.id, { is_active: v }); save({ ...it, is_active: v }); }}
                    />
                    <span className="text-[11px] text-muted-foreground">{isOpen ? "Cerrar" : "Editar"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t p-3 space-y-3 bg-muted/20">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs space-y-1">
                        <Label className="text-xs">Eyebrow</Label>
                        <Input value={it.eyebrow ?? ""} onChange={(e) => update(it.id, { eyebrow: e.target.value })}
                          placeholder="Recomendado para ti" />
                      </label>
                      <label className="text-xs space-y-1">
                        <Label className="text-xs">Prioridad</Label>
                        <Input type="number" value={it.priority}
                          onChange={(e) => update(it.id, { priority: Number(e.target.value) || 100 })} />
                      </label>
                      <label className="text-xs space-y-1 sm:col-span-2">
                        <Label className="text-xs">Título</Label>
                        <Input value={it.title ?? ""} onChange={(e) => update(it.id, { title: e.target.value })}
                          placeholder="Energía natural para tu día" />
                      </label>
                      <label className="text-xs space-y-1 sm:col-span-2">
                        <Label className="text-xs">Subtítulo</Label>
                        <Input value={it.subtitle ?? ""} onChange={(e) => update(it.id, { subtitle: e.target.value })}
                          placeholder="Descubre productos ideales…" />
                      </label>
                      <ImageField
                        value={it.banner_image}
                        slug={it.slug}
                        onChange={(v) => update(it.id, { banner_image: v })}
                      />
                      <label className="text-xs space-y-1">
                        <Label className="text-xs">Texto del botón</Label>
                        <Input value={it.cta_text ?? ""} onChange={(e) => update(it.id, { cta_text: e.target.value })}
                          placeholder="Ver productos" />
                      </label>
                      <label className="text-xs space-y-1">
                        <Label className="text-xs">URL del botón</Label>
                        <Input value={it.cta_url ?? ""} onChange={(e) => update(it.id, { cta_url: e.target.value })}
                          placeholder="/objetivo/energia" />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Vista previa del banner
                      </div>
                      <BannerPreview b={it} />
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={() => save(it)} disabled={savingId === it.id}>
                        <Save className="h-3 w-3 mr-1" />
                        {savingId === it.id ? "Guardando…" : "Guardar banner"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {list.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No hay intenciones todavía. Usa “Intenciones base” para crearlas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function IntentPreviewTester({
  fallbackIntentSlug,
  fallbackBlockTitle,
  fallbackBlockImage,
  fallbackBlockSubtitle,
}: {
  fallbackIntentSlug?: string;
  fallbackBlockTitle?: string | null;
  fallbackBlockImage?: string | null;
  fallbackBlockSubtitle?: string | null;
}) {
  const [intents, setIntents] = useState<IntentBanner[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("purchase_intents")
        .select("id,slug,name,eyebrow,title,subtitle,banner_image,cta_text,cta_url,priority,is_active")
        .order("priority");
      setIntents((data ?? []) as IntentBanner[]);
    })();
  }, []);

  const detected = intents.find((i) => i.slug === selected) || null;
  const fallback = fallbackIntentSlug ? intents.find((i) => i.slug === fallbackIntentSlug) : null;
  let used: Partial<IntentBanner> | null = null;
  let source = "Ninguno";
  if (selected) {
    if (detected && (detected.title || detected.banner_image)) {
      used = detected;
      source = `Banner por intención (${detected.slug})`;
    } else if (fallback) {
      used = fallback;
      source = `Intención de respaldo (${fallback.slug})`;
    } else if (fallbackBlockTitle || fallbackBlockImage) {
      used = { title: fallbackBlockTitle, subtitle: fallbackBlockSubtitle, banner_image: fallbackBlockImage };
      source = "Contenido manual del bloque";
    }
  }

  return (
    <div className="rounded-md border bg-background p-4 space-y-3">
      <div>
        <h4 className="font-semibold text-sm">Probar intención (simulación)</h4>
        <p className="text-[11px] text-muted-foreground">
          Simula una detección de IA para ver exactamente qué banner aparecerá en el Home.
        </p>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        <option value="">— Seleccionar intención —</option>
        {intents.map((i) => (
          <option key={i.slug} value={i.slug}>
            {i.name} ({i.slug}){!i.is_active ? " · inactivo" : ""}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <div className="rounded border bg-muted/40 p-2 text-[11px] space-y-0.5">
            <div><strong>Intención seleccionada:</strong> {detected?.name ?? selected}</div>
            <div><strong>Origen:</strong> prueba manual</div>
            <div><strong>Confianza simulada:</strong> 100%</div>
            <div><strong>Banner usado:</strong> {source}</div>
          </div>
          {used ? (
            <BannerPreview b={used} />
          ) : (
            <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
              No hay banner configurado y no hay contenido manual.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Real-time visitor diagnostic panel.
 * Reads the same localStorage signals the Home uses and shows exactly
 * which intent + banner would be resolved right now.
 */
export function IntentDiagnostics({
  fallbackIntentSlug,
  fallbackBlockTitle,
  fallbackBlockImage,
  fallbackBlockSubtitle,
  confidenceThreshold = 0.2,
}: {
  fallbackIntentSlug?: string;
  fallbackBlockTitle?: string | null;
  fallbackBlockImage?: string | null;
  fallbackBlockSubtitle?: string | null;
  confidenceThreshold?: number;
}) {
  const [tick, setTick] = useState(0);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [signals, setSignals] = useState<BrowseSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [is, sg] = await Promise.all([
      fetchActiveIntents().catch(() => [] as Intent[]),
      fetchRecentBrowseSignals(50).catch(() => [] as BrowseSignal[]),
    ]);
    setIntents(is);
    setSignals(sg);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [tick]);

  const norm = (s: string) => (s || "").toLowerCase().trim();
  const detected = useMemo(() => {
    if (!intents.length || !signals.length) return { intent: null as Intent | null, confidence: 0 };
    const matched = resolveCurrentIntent(intents, signals);
    if (!matched) return { intent: null, confidence: 0 };
    const intentCats = new Set((matched.category_slugs ?? []).map(norm));
    const intentKw = (matched.keywords ?? []).map(norm).filter(Boolean);
    const itSlug = norm(matched.slug);
    const itSlugAlt = itSlug.replace(/[_-]/g, "");
    let hits = 0;
    signals.slice(0, 15).forEach((sig) => {
      const cat = norm(sig.metadata?.category_slug ?? "");
      const q = norm(sig.metadata?.search_query ?? "");
      const pslug = norm(sig.product_slug ?? "");
      if (cat && intentCats.has(cat)) hits += 1;
      if (cat && itSlug && (cat.includes(itSlug) || cat.replace(/[_-]/g, "").includes(itSlugAlt))) hits += 1;
      if (cat && intentKw.some((k) => k.length > 3 && cat.includes(k))) hits += 1;
      if (q && intentKw.some((k) => q.includes(k) || k.includes(q))) hits += 1;
      if (pslug && itSlug && (pslug.includes(itSlug) || pslug.includes(itSlugAlt))) hits += 1;
      if (pslug && intentKw.some((k) => k.length > 3 && pslug.includes(k))) hits += 1;
    });
    return { intent: matched, confidence: Math.min(1, hits / 4) };
  }, [intents, signals]);

  const hasBannerContent = (i: Intent | null | undefined) => !!(i && (i.title || i.banner_image));
  const fallback = fallbackIntentSlug ? intents.find((i) => i.slug === fallbackIntentSlug) : null;

  let mode: "ia" | "respaldo" | "manual" | "oculto" = "manual";
  let used: Partial<IntentBanner> | null = null;
  let appliedSlug: string | null = null;
  if (detected.intent && detected.confidence >= confidenceThreshold && hasBannerContent(detected.intent)) {
    used = detected.intent as any;
    appliedSlug = detected.intent.slug;
    mode = "ia";
  } else if (hasBannerContent(fallback)) {
    used = fallback as any;
    appliedSlug = fallback!.slug;
    mode = "respaldo";
  } else if (fallbackBlockTitle || fallbackBlockImage) {
    used = { title: fallbackBlockTitle, subtitle: fallbackBlockSubtitle, banner_image: fallbackBlockImage };
    mode = "manual";
  } else {
    mode = "oculto";
  }

  const viewedProducts = useMemo(() => getRecentlyViewedSlugsLocal(20), [tick]);
  const localRaw = useMemo(() => getLocalBrowseSignals(50), [tick]);
  const categories = Array.from(new Set(localRaw.map((s) => s.category_slug).filter(Boolean) as string[])).slice(0, 10);
  const searches = Array.from(new Set(localRaw.map((s) => s.search_query).filter(Boolean) as string[])).slice(0, 5);
  const lastUpdate = localRaw[0]?.created_at ?? null;

  const clearHistory = () => {
    try {
      window.localStorage.removeItem("recently_viewed_products");
      window.localStorage.removeItem("visitor_browse_signals");
      window.localStorage.removeItem("visitor_intent_history");
      toast.success("Historial local borrado");
      setTick((t) => t + 1);
    } catch (e: any) { toast.error(e.message || "No se pudo borrar"); }
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right break-all">{v}</span>
    </div>
  );

  return (
    <div className="rounded-md border bg-background p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Diagnóstico de intención
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Lee el historial real del visitante actual (este navegador) y muestra qué banner se aplicaría en el Home en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refrescar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearHistory}>
            <Eraser className="h-3 w-3 mr-1" /> Limpiar historial
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Probar en Home
            </a>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Cargando diagnóstico…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Historial del visitante
            </div>
            <Row k="Historial detectado" v={localRaw.length > 0 ? "Sí" : "No"} />
            <Row k="Eventos registrados" v={localRaw.length} />
            <Row k="Productos vistos" v={viewedProducts.length} />
            {viewedProducts.length > 0 && (
              <Row k="Slugs" v={<span className="text-[10px]">{viewedProducts.slice(0, 5).join(", ")}{viewedProducts.length > 5 ? "…" : ""}</span>} />
            )}
            <Row k="Categorías visitadas" v={categories.length ? categories.join(", ") : "—"} />
            <Row k="Búsquedas" v={searches.length ? searches.join(", ") : "—"} />
            <Row k="Última actualización" v={lastUpdate ? new Date(lastUpdate).toLocaleString() : "—"} />
          </div>

          <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Resolución del banner
            </div>
            <Row k="Intención detectada" v={detected.intent ? `${detected.intent.name} (${detected.intent.slug})` : "—"} />
            <Row k="Confianza" v={detected.confidence.toFixed(2)} />
            <Row k="Umbral configurado" v={confidenceThreshold.toFixed(2)} />
            <Row k="Origen" v={detected.intent ? "browse_history (local)" : "ninguno"} />
            <Row k="Intención de respaldo" v={fallback ? `${fallback.name} (${fallback.slug})` : "—"} />
            <Row k="Intención aplicada" v={appliedSlug ?? "(contenido manual del bloque)"} />
            <Row k="Modo usado" v={
              mode === "ia" ? "IA / reglas (historial)"
              : mode === "respaldo" ? "Respaldo (intención fija)"
              : mode === "manual" ? "Manual (título/imagen del bloque)"
              : "Oculto (sin contenido)"
            } />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Banner que se mostrará actualmente
        </div>
        {used ? (
          <BannerPreview b={used} />
        ) : (
          <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
            No hay banner que mostrar. Si “Ocultar si no hay historial ni respaldo” está activo, el bloque quedará oculto en el Home.
          </div>
        )}
      </div>
    </div>
  );
}
