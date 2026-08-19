// Puntuación de calidad del contenido (útil, natural, original, legible).
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Check, Gauge, Loader2, Wand2, XCircle } from "lucide-react";
import { computeContentQuality, type QualityInput } from "@/lib/contentQuality";
import { scoreColorClass } from "@/lib/seoScore";

type Props = {
  input: QualityInput;
  landingId?: string;
  onApply?: (patch: Record<string, any>) => void;
  onApplySections?: (patch: Record<string, any>) => void;
  onApplyFaqs?: (faqs: { q: string; a: string }[]) => void;
};

export default function LandingContentQualityCard({ input, landingId, onApply, onApplySections, onApplyFaqs }: Props) {
  const result = useMemo(() => computeContentQuality(input), [input]);
  const [fixing, setFixing] = useState(false);
  const kw = result.keywordStats;

  const reduceKeywords = async () => {
    if (!landingId) { toast.error("Guarda la landing antes de corregir"); return; }
    setFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { action: "reduce_keywords", landing_id: landingId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s = (data as any).suggestion ?? {};
      const patch: Record<string, any> = {};
      if (s.intro) patch.intro = s.intro;
      if (s.body_html) patch.body_html = s.body_html;
      if (s.long_description) patch.long_description = s.long_description;
      if (Object.keys(patch).length) onApply?.(patch);

      const secPatch: Record<string, any> = {};
      if (s.what_is?.content) secPatch.what_is = s.what_is;
      if (s.what_to_do) secPatch.what_to_do = s.what_to_do;
      if (s.nutrition) secPatch.nutrition = s.nutrition;
      if (Object.keys(secPatch).length) onApplySections?.(secPatch);

      if (Array.isArray(s.faqs) && s.faqs.length) onApplyFaqs?.(s.faqs.filter((f: any) => f?.q && f?.a));
      toast.success("Menciones reducidas (recuerda guardar)");
    } catch (e: any) { toast.error(e?.message ?? "Error"); } finally { setFixing(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Gauge size={16} className="text-primary" /> Calidad del contenido</CardTitle>
        <CardDescription>Claridad, utilidad, originalidad, estructura y riesgo de afirmaciones de salud.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Puntuación</span>
          <span className={`font-semibold ${scoreColorClass(result.score)}`}>{result.score}/100</span>
        </div>
        <Progress value={result.score} />
        <ul className="space-y-1 text-sm">
          {result.checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              {c.ok ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                : c.level === "error" ? <XCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
                : <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />}
              <span className={c.ok ? "text-muted-foreground" : ""}>{c.message}</span>
            </li>
          ))}
        </ul>
        {kw.high && (
          <div className="space-y-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
            <p>
              “{kw.keyword}” aparece <strong>{kw.count}</strong> veces en {kw.words} palabras ({(kw.density * 100).toFixed(1)}%).
              Lo recomendable es un máximo de {kw.max} menciones (≈2%): sobran <strong>{kw.excess}</strong>.
            </p>
            <Button size="sm" variant="outline" onClick={reduceKeywords} disabled={fixing || !landingId}>
              {fixing ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} Reducir menciones con IA
            </Button>
          </div>
        )}
        {result.score < 70 && (
          <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
            Con menos de 70 puntos conviene revisar y humanizar el contenido antes de publicar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
