// "Humanizar y revisar": asistente editorial sobre el contenido actual de la landing.
// No genera una landing nueva: reescribe lo que ya existe y muestra los avisos.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, PenLine, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { LandingSections } from "@/lib/seoLanding";

type Props = {
  landingId: string;
  row: any;
  sections: LandingSections;
  faqs: { q: string; a: string }[];
  onApply: (patch: Record<string, any>) => void;
  onApplySections: (patch: Partial<LandingSections>) => void;
  onApplyFaqs: (faqs: { q: string; a: string }[]) => void;
};

export default function LandingHumanizeCard({ landingId, row, sections, faqs, onApply, onApplySections, onApplyFaqs }: Props) {
  const [loading, setLoading] = useState<null | "humanize" | "claims">(null);
  const [sug, setSug] = useState<any>(null);
  const [claims, setClaims] = useState<any[] | null>(null);

  const snapshot = () => ({
    saved_at: new Date().toISOString(),
    title: row?.title, intro: row?.intro, body_html: row?.body_html,
    long_description: row?.long_description, faqs, sections,
  });

  const run = async (action: "humanize" | "review_claims") => {
    setLoading(action === "humanize" ? "humanize" : "claims");
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { action, landing_id: landingId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s = (data as any).suggestion ?? {};
      if (action === "humanize") { setSug(s); toast.success("Propuesta editorial lista"); }
      else { setClaims(Array.isArray(s.claims) ? s.claims : []); toast.success("Revisión de afirmaciones completada"); }
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setLoading(null); }
  };

  const applyAll = () => {
    if (!sug) return;
    const patch: Record<string, any> = { previous_version: snapshot(), humanized_at: new Date().toISOString() };
    if (sug.title) patch.title = sug.title;
    if (sug.intro) patch.intro = sug.intro;
    if (sug.body_html) patch.body_html = sug.body_html;
    if (sug.long_description) patch.long_description = sug.long_description;
    onApply(patch);

    const secPatch: Partial<LandingSections> = {};
    if (sug.what_is?.content) secPatch.what_is = sug.what_is;
    if (sug.what_to_do) secPatch.what_to_do = sug.what_to_do;
    if (sug.nutrition) secPatch.nutrition = sug.nutrition;
    if (Array.isArray(sug.nutrients) && sug.nutrients.length) secPatch.nutrients = sug.nutrients;
    if (Array.isArray(sug.ingredients)) secPatch.ingredients = sug.ingredients;
    if (Object.keys(secPatch).length) onApplySections(secPatch);

    if (Array.isArray(sug.faqs) && sug.faqs.length) onApplyFaqs(sug.faqs.filter((f: any) => f?.q && f?.a));
    toast.success("Contenido humanizado aplicado (recuerda guardar)");
  };

  const restore = () => {
    const prev = row?.previous_version;
    if (!prev) return;
    onApply({
      title: prev.title, intro: prev.intro, body_html: prev.body_html,
      long_description: prev.long_description,
    });
    if (prev.sections) onApplySections(prev.sections);
    if (Array.isArray(prev.faqs)) onApplyFaqs(prev.faqs);
    toast.success("Versión anterior restaurada (recuerda guardar)");
  };

  const Block = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <p className="whitespace-pre-wrap text-sm">{value.replace(/<[^>]+>/g, " ").slice(0, 700)}</p>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><PenLine size={16} className="text-primary" /> Humanizar y revisar</CardTitle>
          <CardDescription>Mejora naturalidad, claridad y originalidad del contenido actual. No genera una landing nueva.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => run("review_claims")} disabled={!!loading}>
            {loading === "claims" ? <Loader2 className="animate-spin" size={14} /> : <ShieldAlert size={14} />} Validar salud/claims
          </Button>
          <Button size="sm" onClick={() => run("humanize")} disabled={!!loading}>
            {loading === "humanize" ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Humanizar y revisar
          </Button>
          {row?.previous_version && (
            <Button size="sm" variant="ghost" onClick={restore}><RotateCcw size={14} /> Restaurar versión anterior</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {claims && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">Afirmaciones de salud</p>
            {claims.length === 0 ? (
              <p className="text-sm text-emerald-600">No se detectaron afirmaciones que requieran revisión.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {claims.map((c, i) => (
                  <li key={i} className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/20">
                    <span className="flex items-center gap-2 font-medium"><AlertTriangle size={14} className="text-amber-500" /> Revisar afirmación de salud</span>
                    <p className="mt-1 text-muted-foreground">“{c.text}”{c.where ? ` — ${c.where}` : ""}</p>
                    {c.suggestion && <p className="mt-1">Sugerencia: {c.suggestion}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {sug && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                Propuesta humanizada
                {typeof sug.content_score === "number" && <Badge variant="outline">Calidad IA {sug.content_score}</Badge>}
              </span>
              <Button size="sm" onClick={applyAll}>Aplicar propuesta</Button>
            </div>
            {Array.isArray(sug.changes) && sug.changes.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {sug.changes.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            )}
            {(Array.isArray(sug.generic_phrases) && sug.generic_phrases.length > 0) && (
              <p className="text-sm text-amber-600">Frases genéricas detectadas: {sug.generic_phrases.join(" · ")}</p>
            )}
            {(Array.isArray(sug.repetitions) && sug.repetitions.length > 0) && (
              <p className="text-sm text-amber-600">Repeticiones: {sug.repetitions.join(" · ")}</p>
            )}
            {(Array.isArray(sug.health_claims) && sug.health_claims.length > 0) && (
              <ul className="space-y-1 text-sm">
                {sug.health_claims.map((h: any, i: number) => (
                  <li key={i} className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/20">
                    <strong>Revisar afirmación de salud:</strong> “{h.text}” → {h.suggestion}
                  </li>
                ))}
              </ul>
            )}
            <Block label="H1" value={sug.title} />
            <Block label="Introducción" value={sug.intro} />
            <Block label="Contenido principal" value={sug.body_html} />
            <Block label="Cierre" value={sug.long_description} />
            {Array.isArray(sug.faqs) && sug.faqs.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">FAQs ({sug.faqs.length})</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {sug.faqs.slice(0, 8).map((f: any, i: number) => <li key={i}>{f.q}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
