// Simple deterministic SEO score (0-100) used by the admin panel.
// Stage 2 will add IA-based suggestions; this is the baseline rubric.

export type ScoreInput = {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  keywords?: string[] | null;
  ogImage?: string | null;
  imagesWithAlt?: number;
  imagesTotal?: number;
  hasJsonLd?: boolean;
  hasShortDescription?: boolean;
  hasLongDescription?: boolean;
};

export type ScoreIssue = { level: "error" | "warn" | "info"; field: string; message: string };

export const computeSeoScore = (input: ScoreInput): { score: number; issues: ScoreIssue[] } => {
  const issues: ScoreIssue[] = [];
  let score = 0;

  // Title (25 pts)
  const t = (input.title ?? "").trim();
  if (!t) issues.push({ level: "error", field: "title", message: "Falta el título SEO" });
  else if (t.length < 30) { score += 10; issues.push({ level: "warn", field: "title", message: "Título corto (<30)" }); }
  else if (t.length > 65) { score += 15; issues.push({ level: "warn", field: "title", message: "Título largo (>65)" }); }
  else score += 25;

  // Description (25 pts)
  const d = (input.description ?? "").trim();
  if (!d) issues.push({ level: "error", field: "description", message: "Falta la meta descripción" });
  else if (d.length < 100) { score += 10; issues.push({ level: "warn", field: "description", message: "Descripción corta (<100)" }); }
  else if (d.length > 170) { score += 15; issues.push({ level: "warn", field: "description", message: "Descripción larga (>170)" }); }
  else score += 25;

  // Slug (10 pts)
  const s = (input.slug ?? "").trim();
  if (s && /^[a-z0-9-]+$/.test(s) && s.length <= 75) score += 10;
  else if (s) issues.push({ level: "warn", field: "slug", message: "Slug no óptimo" });
  else issues.push({ level: "error", field: "slug", message: "Falta slug" });

  // Keywords (10 pts)
  if ((input.keywords?.length ?? 0) >= 3) score += 10;
  else issues.push({ level: "info", field: "keywords", message: "Agrega al menos 3 palabras clave" });

  // OG image (5 pts)
  if (input.ogImage) score += 5;
  else issues.push({ level: "info", field: "og_image", message: "Falta imagen para compartir (OG)" });

  // Alt text coverage (15 pts)
  const total = input.imagesTotal ?? 0;
  const withAlt = input.imagesWithAlt ?? 0;
  if (total === 0) score += 0;
  else {
    const ratio = withAlt / total;
    score += Math.round(ratio * 15);
    if (ratio < 1) issues.push({ level: "warn", field: "alt_text", message: `${total - withAlt} imagen(es) sin alt` });
  }

  // JSON-LD (5 pts)
  if (input.hasJsonLd) score += 5;

  // Short + long descriptions (5 pts)
  if (input.hasShortDescription && input.hasLongDescription) score += 5;
  else if (!input.hasShortDescription) issues.push({ level: "info", field: "short_description", message: "Falta descripción corta" });

  return { score: Math.min(100, Math.max(0, score)), issues };
};

export const scoreColorClass = (score: number) =>
  score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-destructive";

export const scoreBadgeClass = (score: number) =>
  score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
  : score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
  : "bg-destructive/10 text-destructive";
