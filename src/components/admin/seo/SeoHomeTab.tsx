import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Save, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { scoreBadgeClass } from "@/lib/seoScore";
import { scanSensitiveClaims, highestSeverity } from "@/lib/sensitiveClaims";

type HomeMeta = {
  entity_type: "page";
  entity_id: "home";
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical: string | null;
  robots_directive: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  h1: string | null;
  intro_text: string | null;
  llms_summary: string | null;
  schema_jsonld: any;
  keywords: string[] | null;
};

const EMPTY: HomeMeta = {
  entity_type: "page", entity_id: "home", slug: "/",
  seo_title: "", seo_description: "", canonical: "/", robots_directive: "index,follow",
  og_title: "", og_description: "", og_image: "", og_site_name: "Nutribatidos",
  twitter_title: "", twitter_description: "", twitter_image: "",
  h1: "", intro_text: "", llms_summary: "",
  schema_jsonld: null, keywords: [],
};

type Suggestion = {
  title_options: string[]; description_options: string[];
  h1: string; intro_text: string;
  og_title: string; og_description: string;
  twitter_title: string; twitter_description: string;
  llms_summary: string; keywords: string[]; recommendations?: string[];
  schema_website: any; schema_organization: any;
};

function computeHomeScore(m: HomeMeta): { score: number; checks: { label: string; ok: boolean }[] } {
  const t = (m.seo_title ?? "").length;
  const d = (m.seo_description ?? "").length;
  const arr = Array.isArray(m.schema_jsonld) ? m.schema_jsonld : m.schema_jsonld ? [m.schema_jsonld] : [];
  const hasWebsite = arr.some((s: any) => s?.["@type"] === "WebSite");
  const hasOrg = arr.some((s: any) => s?.["@type"] === "Organization");
  const checks = [
    { label: `Title 30–60 chars (${t})`, ok: t >= 30 && t <= 60 },
    { label: `Description 120–160 chars (${d})`, ok: d >= 120 && d <= 160 },
    { label: "Canonical", ok: !!m.canonical },
    { label: "og:site_name", ok: !!m.og_site_name },
    { label: "og:image", ok: !!m.og_image },
    { label: "og:title + og:description", ok: !!m.og_title && !!m.og_description },
    { label: "twitter card completa", ok: !!m.twitter_title && !!m.twitter_description },
    { label: "Schema WebSite", ok: hasWebsite },
    { label: "Schema Organization", ok: hasOrg },
    { label: "llms_summary", ok: !!(m.llms_summary ?? "").trim() },
    { label: "H1", ok: !!(m.h1 ?? "").trim() },
    { label: "Texto introductorio", ok: !!(m.intro_text ?? "").trim() },
    { label: "Robots index,follow", ok: (m.robots_directive ?? "").toLowerCase().includes("index") && !(m.robots_directive ?? "").toLowerCase().includes("noindex") },
  ];
  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { score, checks };
}

export function SeoHomeTab() {
  const [m, setM] = useState<HomeMeta>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sug, setSug] = useState<Suggestion | null>(null);
  const [extra, setExtra] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("seo_meta" as any).select("*")
      .eq("entity_type", "page").eq("entity_id", "home").maybeSingle();
    if (data) setM({ ...EMPTY, ...(data as any) });
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof HomeMeta>(k: K, v: HomeMeta[K]) => setM(p => ({ ...p, [k]: v }));

  const { score, checks } = useMemo(() => computeHomeScore(m), [m]);

  const claimsText = `${m.seo_title} ${m.seo_description} ${m.h1} ${m.intro_text} ${m.llms_summary} ${m.og_description} ${m.twitter_description}`;
  const claimHits = scanSensitiveClaims(claimsText);
  const claimsLevel = highestSeverity(claimHits);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...m, entity_type: "page", entity_id: "home" };
      const { error } = await supabase.from("seo_meta" as any).upsert(payload, { onConflict: "entity_type,entity_id" });
      if (error) throw error;
      toast.success("SEO de Home guardado");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-home-generate", { body: { extra_context: extra } });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      setSug((data as any).suggestion as Suggestion);
      toast.success("Sugerencias generadas");
    } catch (e: any) { toast.error(e.message); } finally { setGenerating(false); }
  };

  const applyAll = () => {
    if (!sug) return;
    set("seo_title", sug.title_options[0] ?? m.seo_title);
    set("seo_description", sug.description_options[0] ?? m.seo_description);
    set("h1", sug.h1);
    set("intro_text", sug.intro_text);
    set("og_title", sug.og_title);
    set("og_description", sug.og_description);
    set("twitter_title", sug.twitter_title);
    set("twitter_description", sug.twitter_description);
    set("llms_summary", sug.llms_summary);
    set("keywords", sug.keywords);
    set("schema_jsonld", [sug.schema_website, sug.schema_organization].filter(Boolean));
    toast.success("Sugerencias aplicadas (recuerda Guardar)");
  };

  if (!loaded) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Editor */}
      <div className="space-y-4 lg:col-span-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">SEO Home — Edición manual</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreBadgeClass(score)}`}>Score {score}/100</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del sitio (og:site_name)"><Input value={m.og_site_name ?? ""} onChange={e => set("og_site_name", e.target.value)} /></Field>
            <Field label="Canonical URL"><Input value={m.canonical ?? ""} onChange={e => set("canonical", e.target.value)} placeholder="/" /></Field>
            <Field label={`Meta title (${(m.seo_title ?? "").length}/60)`}><Input value={m.seo_title ?? ""} onChange={e => set("seo_title", e.target.value)} /></Field>
            <Field label="Robots"><Input value={m.robots_directive ?? ""} onChange={e => set("robots_directive", e.target.value)} placeholder="index,follow" /></Field>
          </div>
          <Field label={`Meta description (${(m.seo_description ?? "").length}/160)`}>
            <Textarea rows={2} value={m.seo_description ?? ""} onChange={e => set("seo_description", e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="H1 principal"><Input value={m.h1 ?? ""} onChange={e => set("h1", e.target.value)} /></Field>
            <Field label="Open Graph image (URL)"><Input value={m.og_image ?? ""} onChange={e => set("og_image", e.target.value)} /></Field>
            <Field label="OG title"><Input value={m.og_title ?? ""} onChange={e => set("og_title", e.target.value)} /></Field>
            <Field label="Twitter title"><Input value={m.twitter_title ?? ""} onChange={e => set("twitter_title", e.target.value)} /></Field>
            <Field label="OG description"><Textarea rows={2} value={m.og_description ?? ""} onChange={e => set("og_description", e.target.value)} /></Field>
            <Field label="Twitter description"><Textarea rows={2} value={m.twitter_description ?? ""} onChange={e => set("twitter_description", e.target.value)} /></Field>
            <Field label="Twitter image (URL)"><Input value={m.twitter_image ?? ""} onChange={e => set("twitter_image", e.target.value)} /></Field>
          </div>

          <Field label="Texto introductorio"><Textarea rows={4} value={m.intro_text ?? ""} onChange={e => set("intro_text", e.target.value)} /></Field>
          <Field label="Resumen para llms.txt"><Textarea rows={3} value={m.llms_summary ?? ""} onChange={e => set("llms_summary", e.target.value)} /></Field>
          <Field label="Schema JSON-LD (WebSite + Organization)">
            <Textarea rows={8} className="font-mono text-xs" value={m.schema_jsonld ? JSON.stringify(m.schema_jsonld, null, 2) : ""} onChange={e => {
              try { set("schema_jsonld", e.target.value ? JSON.parse(e.target.value) : null); } catch { set("schema_jsonld", e.target.value as any); }
            }} />
          </Field>

          <div className="flex justify-end">
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar cambios
            </Button>
          </div>
        </Card>

        {/* IA */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Generar con IA</h3>
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generar sugerencias
            </Button>
          </div>
          <Textarea rows={2} placeholder="Contexto adicional opcional (ofertas, lanzamientos, foco actual)…" value={extra} onChange={e => setExtra(e.target.value)} />

          {sug && (
            <div className="space-y-4 rounded-md border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sugerencias</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="dark" onClick={applyAll}><Check size={14} /> Aceptar todo</Button>
                  <Button size="sm" variant="outline" onClick={generate} disabled={generating}><RefreshCw size={14} /> Regenerar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSug(null)}><X size={14} /> Rechazar</Button>
                </div>
              </div>

              <OptionList title="Meta titles" items={sug.title_options} onPick={(v) => set("seo_title", v)} />
              <OptionList title="Meta descriptions" items={sug.description_options} onPick={(v) => set("seo_description", v)} />

              <Picked label="H1" value={sug.h1} onApply={() => set("h1", sug.h1)} />
              <Picked label="Intro" value={sug.intro_text} onApply={() => set("intro_text", sug.intro_text)} multiline />
              <Picked label="OG title" value={sug.og_title} onApply={() => set("og_title", sug.og_title)} />
              <Picked label="OG description" value={sug.og_description} onApply={() => set("og_description", sug.og_description)} multiline />
              <Picked label="Twitter title" value={sug.twitter_title} onApply={() => set("twitter_title", sug.twitter_title)} />
              <Picked label="Twitter description" value={sug.twitter_description} onApply={() => set("twitter_description", sug.twitter_description)} multiline />
              <Picked label="llms.txt summary" value={sug.llms_summary} onApply={() => set("llms_summary", sug.llms_summary)} multiline />

              <div className="text-xs">
                <div className="font-medium mb-1">Keywords</div>
                <div className="flex flex-wrap gap-1">{sug.keywords.map(k => <span key={k} className="rounded bg-background px-2 py-0.5 border">{k}</span>)}</div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => set("keywords", sug.keywords)}>Aplicar keywords</Button>
              </div>

              {sug.recommendations?.length ? (
                <div className="text-xs">
                  <div className="font-medium mb-1">Recomendaciones</div>
                  <ul className="list-disc pl-5 space-y-0.5">{sug.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              ) : null}

              <Button size="sm" variant="outline" onClick={() => set("schema_jsonld", [sug.schema_website, sug.schema_organization].filter(Boolean))}>Aplicar Schema WebSite + Organization</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar: validación + claims */}
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-display text-lg mb-3">Validación</h3>
          <ul className="space-y-1.5 text-sm">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                {c.ok ? <Check size={16} className="text-emerald-600 mt-0.5" /> : <X size={16} className="text-destructive mt-0.5" />}
                <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-lg mb-2">Claims sensibles</h3>
          {claimsLevel === "none" ? (
            <p className="text-sm text-emerald-600">Sin claims médicos detectados.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Detectados {claimHits.length} término(s) ({claimsLevel}).</p>
              <ul className="text-xs space-y-1">
                {claimHits.slice(0, 8).map((h, i) => (
                  <li key={i}>"{h.match}" → <span className="text-emerald-700">{h.rule.suggestion}</span></li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);

const OptionList = ({ title, items, onPick }: { title: string; items: string[]; onPick: (v: string) => void }) => (
  <div className="text-xs">
    <div className="font-medium mb-1">{title}</div>
    <ul className="space-y-1">
      {items.map((v, i) => (
        <li key={i} className="flex items-start gap-2 rounded border bg-background p-2">
          <span className="flex-1">{v} <span className="text-muted-foreground">({v.length})</span></span>
          <Button size="sm" variant="ghost" onClick={() => onPick(v)}><Check size={12} /></Button>
        </li>
      ))}
    </ul>
  </div>
);

const Picked = ({ label, value, onApply, multiline }: { label: string; value: string; onApply: () => void; multiline?: boolean }) => (
  <div className="text-xs">
    <div className="flex items-center justify-between mb-1">
      <span className="font-medium">{label}</span>
      <Button size="sm" variant="ghost" onClick={onApply}><Check size={12} /> Aplicar</Button>
    </div>
    <div className={`rounded border bg-background p-2 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</div>
  </div>
);
