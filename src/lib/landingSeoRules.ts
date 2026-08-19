// Reglas SEO de las Landings SEO: longitudes, estados y puntuación real.
export const TITLE_MIN = 50;
export const TITLE_MAX = 60;
export const DESC_MIN = 148;
export const DESC_MAX = 170;
export const DESC_OPT_MIN = 155;
export const DESC_OPT_MAX = 160;

export type LenState = "empty" | "short" | "ok" | "optimal" | "long";

export const titleState = (v?: string | null): LenState => {
  const n = (v ?? "").trim().length;
  if (!n) return "empty";
  if (n < TITLE_MIN) return "short";
  if (n > TITLE_MAX) return "long";
  return "optimal";
};

export const descriptionState = (v?: string | null): LenState => {
  const n = (v ?? "").trim().length;
  if (!n) return "empty";
  if (n < DESC_MIN) return "short";
  if (n > DESC_MAX) return "long";
  if (n >= DESC_OPT_MIN && n <= DESC_OPT_MAX) return "optimal";
  return "ok";
};

export const stateLabel = (s: LenState) =>
  s === "empty" ? "Falta completar"
  : s === "short" ? "Demasiado corto"
  : s === "long" ? "Demasiado largo"
  : s === "optimal" ? "Óptimo"
  : "Correcto";

export const stateIcon = (s: LenState) => (s === "ok" || s === "optimal" ? "✅" : "⚠");

export const stateClass = (s: LenState) =>
  s === "optimal" || s === "ok"
    ? "text-emerald-600 dark:text-emerald-400"
    : s === "empty"
      ? "text-destructive"
      : "text-amber-600 dark:text-amber-500";

export type LandingSeoCheck = { key: string; ok: boolean; message: string; weight: number };

export type LandingSeoInput = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  keyword?: string | null;
  secondaryKeywords?: string[] | null;
  h1?: string | null;
  heroImage?: string | null;
  heroImageAlt?: string | null;
  faqsCount?: number;
  relatedTopicsCount?: number;
};

export const computeLandingSeoScore = (
  input: LandingSeoInput,
): { score: number; checks: LandingSeoCheck[]; issues: LandingSeoCheck[] } => {
  const checks: LandingSeoCheck[] = [];

  const title = (input.metaTitle ?? "").trim();
  const ts = titleState(title);
  checks.push({
    key: "meta_title",
    weight: 20,
    ok: ts === "ok" || ts === "optimal",
    message: !title
      ? "Falta el SEO title"
      : ts === "short" ? `SEO title demasiado corto — ${title.length} caracteres (mín. ${TITLE_MIN})`
      : ts === "long" ? `SEO title demasiado largo — ${title.length} caracteres (máx. ${TITLE_MAX})`
      : `SEO title correcto — ${title.length} caracteres`,
  });

  const desc = (input.metaDescription ?? "").trim();
  const ds = descriptionState(desc);
  checks.push({
    key: "meta_description",
    weight: 20,
    ok: ds === "ok" || ds === "optimal",
    message: !desc
      ? "Falta la meta description"
      : ds === "short" ? `Meta description demasiado corta — ${desc.length} caracteres (mín. ${DESC_MIN})`
      : ds === "long" ? `Meta description demasiado larga — ${desc.length} caracteres (máx. ${DESC_MAX})`
      : `Meta description correcta — ${desc.length} caracteres`,
  });

  const kw = (input.keyword ?? "").trim();
  checks.push({
    key: "keyword",
    weight: 10,
    ok: !!kw,
    message: kw ? "Palabra clave principal" : "Falta la palabra clave principal",
  });

  const sec = (input.secondaryKeywords ?? []).map((k) => String(k).trim()).filter(Boolean);
  checks.push({
    key: "secondary",
    weight: 10,
    ok: sec.length >= 3,
    message: sec.length >= 3
      ? `${sec.length} palabras clave secundarias`
      : `Agrega al menos 3 palabras clave secundarias (tienes ${sec.length})`,
  });

  const h1 = (input.h1 ?? "").trim();
  checks.push({ key: "h1", weight: 10, ok: !!h1, message: h1 ? "H1 definido" : "Falta el H1" });

  const hasImg = !!(input.heroImage ?? "").trim();
  const hasAlt = !!(input.heroImageAlt ?? "").trim();
  checks.push({
    key: "image_alt",
    weight: 15,
    ok: hasImg && hasAlt,
    message: !hasImg ? "Falta la imagen del hero" : hasAlt ? "Imagen con ALT" : "La imagen del hero no tiene texto ALT",
  });

  const faqs = input.faqsCount ?? 0;
  checks.push({
    key: "faqs",
    weight: 10,
    ok: faqs >= 3,
    message: faqs >= 3 ? "FAQ" : `Agrega al menos 3 preguntas frecuentes (tienes ${faqs})`,
  });

  const topics = input.relatedTopicsCount ?? 0;
  checks.push({
    key: "related_topics",
    weight: 5,
    ok: topics >= 1,
    message: topics >= 1 ? "Temas relacionados" : "Falta tema relacionado",
  });

  const score = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  return { score, checks, issues: checks.filter((c) => !c.ok) };
};
