import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Save, RefreshCw } from "lucide-react";

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
};

const INITIAL_SLUGS = [
  "energia", "digestion", "control_peso", "articulaciones", "colageno",
  "masa_muscular", "fitness", "defensas", "piel_cabello_unas", "bienestar_general",
];

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

export function IntentBannersManager() {
  const [list, setList] = useState<IntentBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("purchase_intents")
      .select("id,slug,name,eyebrow,title,subtitle,banner_image,cta_text,cta_url,priority,is_active")
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
            Define exactamente qué banner aparece cuando la IA detecta cada intención.
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
                      <label className="text-xs space-y-1 sm:col-span-2">
                        <Label className="text-xs">Imagen de fondo (URL)</Label>
                        <Input value={it.banner_image ?? ""} onChange={(e) => update(it.id, { banner_image: e.target.value })}
                          placeholder="https://…" />
                      </label>
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
  // Resolution rules (mirrors AiDynamicBanner):
  // 1) detected with banner content (title or image) → use it
  // 2) fallback intent → use it
  // 3) manual block title/image → use it
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
        <h4 className="font-semibold text-sm">Probar intención</h4>
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
              No hay banner configurado y no hay contenido manual. En el Home, este caso se ocultará si está activo
              “Ocultar si no hay historial ni respaldo”.
            </div>
          )}
        </>
      )}
    </div>
  );
}
