// Bloque "SEO con IA" para el editor de landings: score en vivo + sugerencias IA aplicables.
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { scoreColorClass } from "@/lib/seoScore";
import { computeLandingSeoScore } from "@/lib/landingSeoRules";

type Props = {
  landingId: string;
  row: any;
  faqs: { q: string; a: string }[];
  sectionsRelatedCount?: number;
  onApply: (patch: Record<string, any>) => void;
  onApplyFaqs: (faqs: { q: string; a: string }[]) => void;
};

export default function LandingSeoAiCard({ landingId, row, faqs, sectionsRelatedCount = 0, onApply, onApplyFaqs }: Props) {
  const [loading, setLoading] = useState(false);
  const [sug, setSug] = useState<any>(null);

  const { score, checks } = useMemo(
    () =>
      computeLandingSeoScore({
        metaTitle: row?.meta_title,
        metaDescription: row?.meta_description,
        keyword: row?.keyword,
        secondaryKeywords: Array.isArray(row?.keyword_secondary) ? row.keyword_secondary : [],
        h1: row?.title,
        heroImage: row?.hero_image ?? row?.og_image,
        heroImageAlt: row?.hero_image_alt,
        faqsCount: faqs.length,
        relatedTopicsCount: sectionsRelatedCount,
      }),
    [row, faqs, sectionsRelatedCount],
  );

  const optimize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { action: "optimize_seo", landing_id: landingId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSug((data as any).suggestion ?? {});
      toast.success("Sugerencias SEO generadas");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al optimizar");
    } finally {
      setLoading(false);
    }
  };

  const applyAll = () => {
    if (!sug) return;
    const patch: Record<string, any> = {};
    if (sug.meta_title) patch.meta_title = sug.meta_title;
    if (sug.meta_description) patch.meta_description = sug.meta_description;
    if (sug.og_title) patch.og_title = sug.og_title;
    if (sug.og_description) patch.og_description = sug.og_description;
    if (sug.h1) patch.title = sug.h1;
    if (sug.intro) patch.intro = sug.intro;
    if (sug.keyword) patch.keyword = sug.keyword;
    if (Array.isArray(sug.keyword_secondary) && sug.keyword_secondary.length) {
      patch.keyword_secondary = sug.keyword_secondary;
    }
    onApply(patch);
    if (Array.isArray(sug.faqs) && sug.faqs.length) onApplyFaqs(sug.faqs.filter((f: any) => f?.q && f?.a));
    toast.success("Sugerencias aplicadas (recuerda guardar)");
  };

  const Row = ({ label, value, field }: { label: string; value?: string; field: string }) =>
    value ? (
      <div className="rounded-lg border border-border p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Button size="sm" variant="secondary" onClick={() => { onApply({ [field]: value }); toast.success("Aplicado"); }}>
            Aplicar
          </Button>
        </div>
        <p className="text-sm">{value}</p>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-primary" /> SEO con IA
          </CardTitle>
          <CardDescription>Puntuación en vivo y optimización automática de meta, H1, intro y FAQs.</CardDescription>
        </div>
        <Button size="sm" onClick={optimize} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Optimizar con IA
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Puntuación SEO</span>
            <span className={`font-semibold ${scoreColorClass(score)}`}>{score}/100</span>
          </div>
          <Progress value={score} />
        </div>

        {issues.length > 0 && (
          <ul className="space-y-1 text-sm">
            {issues.map((i, x) => (
              <li key={x} className="flex items-start gap-2 text-muted-foreground">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                <span>{i.message}</span>
              </li>
            ))}
          </ul>
        )}
        {issues.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-emerald-600"><Check size={14} /> Todo en orden.</p>
        )}

        {sug && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Sugerencias de la IA {typeof sug.score === "number" && <Badge variant="outline">Score IA {sug.score}</Badge>}</span>
              <Button size="sm" onClick={applyAll}>Aplicar todo</Button>
            </div>
            <Row label="Meta title" value={sug.meta_title} field="meta_title" />
            <Row label="Meta description" value={sug.meta_description} field="meta_description" />
            <Row label="H1" value={sug.h1} field="title" />
            <Row label="Introducción" value={sug.intro} field="intro" />
            <Row label="OG title" value={sug.og_title} field="og_title" />
            <Row label="OG description" value={sug.og_description} field="og_description" />
            {Array.isArray(sug.faqs) && sug.faqs.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">FAQs sugeridas ({sug.faqs.length})</span>
                  <Button size="sm" variant="secondary" onClick={() => { onApplyFaqs(sug.faqs.filter((f: any) => f?.q && f?.a)); toast.success("FAQs aplicadas"); }}>
                    Aplicar
                  </Button>
                </div>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {sug.faqs.slice(0, 6).map((f: any, i: number) => <li key={i}>{f.q}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(sug.recommendations) && sug.recommendations.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 font-medium">Recomendaciones</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {sug.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
