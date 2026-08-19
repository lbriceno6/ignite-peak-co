// Puntuación de calidad del contenido (útil, natural, original, legible).
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Check, Gauge, XCircle } from "lucide-react";
import { computeContentQuality, type QualityInput } from "@/lib/contentQuality";
import { scoreColorClass } from "@/lib/seoScore";

export default function LandingContentQualityCard({ input }: { input: QualityInput }) {
  const result = useMemo(() => computeContentQuality(input), [input]);

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
        {result.score < 70 && (
          <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
            Con menos de 70 puntos conviene revisar y humanizar el contenido antes de publicar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
