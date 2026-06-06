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

// ============================================================================
// Product-specific 100/100 SEO rubric.
// Each field contributes a fixed weight; total = 100 when every rule passes.
// ============================================================================

export type ProductSeoField =
  | "seo_title" | "seo_description" | "slug" | "canonical" | "og_image"
  | "keywords" | "tags" | "shopping_title" | "shopping_description"
  | "short_description" | "long_description" | "image_alts";

export type ProductSeoBreakdown = {
  field: ProductSeoField;
  label: string;
  weight: number;
  earned: number;
  ok: boolean;
  message: string;   // what is missing/wrong
  fix: string;       // how to fix it
};

export type ProductSeoInput = {
  productName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  canonical?: string | null;
  ogImage?: string | null;
  keywords?: string[] | null;
  tags?: string[] | null;
  shoppingTitle?: string | null;
  shoppingDescription?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  imagesTotal?: number;
  imagesWithAlt?: number;
};

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export const computeProductSeoScore = (
  input: ProductSeoInput,
): { score: number; breakdown: ProductSeoBreakdown[]; missing: ProductSeoField[] } => {
  const b: ProductSeoBreakdown[] = [];
  const push = (
    field: ProductSeoField, label: string, weight: number,
    ok: boolean, message: string, fix: string,
  ) => b.push({ field, label, weight, earned: ok ? weight : 0, ok, message, fix });

  // 1. Title (12) — 45-60 chars + incluye nombre del producto
  const title = (input.seoTitle ?? "").trim();
  const name = (input.productName ?? "").trim();
  const titleOk = !!title && title.length >= 45 && title.length <= 60
    && (!name || norm(title).includes(norm(name).split(" ")[0] ?? ""));
  push("seo_title", "Título SEO", 12, titleOk,
    !title ? "Falta el título SEO"
    : title.length < 45 ? `Título muy corto (${title.length}, ideal 45-60)`
    : title.length > 60 ? `Título muy largo (${title.length}, máx 60)`
    : !norm(title).includes(norm(name).split(" ")[0] ?? "") ? "El título no incluye el nombre del producto"
    : "OK",
    "Escribe un título de 45-60 caracteres incluyendo el nombre del producto.");

  // 2. Description (12) — 130-160
  const desc = (input.seoDescription ?? "").trim();
  const descOk = !!desc && desc.length >= 130 && desc.length <= 160;
  push("seo_description", "Meta descripción", 12, descOk,
    !desc ? "Falta la meta descripción"
    : desc.length < 130 ? `Descripción corta (${desc.length}, ideal 130-160)`
    : desc.length > 160 ? `Descripción larga (${desc.length}, máx 160)`
    : "OK",
    "Redacta una meta descripción clara y comercial de 130-160 caracteres.");

  // 3. Slug (8)
  const slug = (input.slug ?? "").trim();
  const slugOk = !!slug && /^[a-z0-9-]+$/.test(slug) && slug.length <= 75;
  push("slug", "Slug", 8, slugOk,
    !slug ? "Falta el slug"
    : !/^[a-z0-9-]+$/.test(slug) ? "El slug tiene tildes o caracteres especiales"
    : slug.length > 75 ? "Slug demasiado largo"
    : "OK",
    "Usa minúsculas, sin tildes, separa con guiones y máx 75 caracteres.");

  // 4. Canonical (7)
  const canonical = (input.canonical ?? "").trim();
  const canonOk = !!canonical && (canonical.startsWith("/") || /^https?:\/\//.test(canonical));
  push("canonical", "Canonical URL", 7, canonOk,
    !canonical ? "Falta la URL canónica" : !canonOk ? "Canonical inválida" : "OK",
    "Apunta a la URL real del producto, p.ej. /producto/<slug>.");

  // 5. OG image (7)
  const og = (input.ogImage ?? "").trim();
  push("og_image", "Imagen OG", 7, !!og,
    og ? "OK" : "Falta imagen para compartir (OG)",
    "Usa la imagen principal optimizada del producto.");

  // 6. Keywords (8) — mín 3, ideal 5-8
  const kws = (input.keywords ?? []).filter((x) => !!x && x.trim());
  const kwOk = kws.length >= 5 && kws.length <= 8;
  push("keywords", "Palabras clave", 8, kwOk,
    kws.length === 0 ? "Faltan palabras clave"
    : kws.length < 3 ? `Solo ${kws.length} palabra(s) clave (mín 3)`
    : kws.length < 5 ? `Ideal 5-8 palabras clave (tienes ${kws.length})`
    : kws.length > 8 ? `Demasiadas (${kws.length}); ideal 5-8`
    : "OK",
    "Agrega entre 5 y 8 palabras clave relevantes.");

  // 7. Tags (8) — mín 3
  const tgs = (input.tags ?? []).filter((x) => !!x && x.trim());
  const tagOk = tgs.length >= 3;
  push("tags", "Tags", 8, tagOk,
    tgs.length === 0 ? "Faltan tags"
    : tgs.length < 3 ? `Solo ${tgs.length} tag(s) (mín 3)`
    : "OK",
    "Agrega al menos 3 tags (categoría, ingrediente, objetivo, beneficio).");

  // 8. Shopping title (8)
  const sht = (input.shoppingTitle ?? "").trim();
  const shtOk = !!sht && sht.length <= 150;
  push("shopping_title", "Título Google Shopping", 8, shtOk,
    !sht ? "Falta título de Google Shopping"
    : sht.length > 150 ? `Demasiado largo (${sht.length}, máx 150)` : "OK",
    "Incluye producto, marca y presentación; máx 150 caracteres.");

  // 9. Shopping description (8)
  const shd = (input.shoppingDescription ?? "").trim();
  push("shopping_description", "Descripción Google Shopping", 8, !!shd,
    shd ? "OK" : "Falta descripción de Google Shopping",
    "Redacta una descripción clara y comercial, sin claims médicos.");

  // 10. Short description (7) — < 100
  const sd = (input.shortDescription ?? "").trim();
  const sdOk = !!sd && sd.length < 100;
  push("short_description", "Descripción corta", 7, sdOk,
    !sd ? "Falta descripción corta"
    : sd.length >= 100 ? `Muy larga (${sd.length}, máx 99)` : "OK",
    "Resume el producto en menos de 100 caracteres.");

  // 11. Long description (8) — >= 120 chars
  const ld = (input.longDescription ?? "").trim();
  const ldOk = !!ld && ld.length >= 120;
  push("long_description", "Descripción larga", 8, ldOk,
    !ld ? "Falta descripción larga"
    : ld.length < 120 ? `Muy corta (${ld.length}, mín 120)` : "OK",
    "Explica el producto, beneficio general y forma de uso (≥120 chars).");

  // 12. Image alts (7) — todas las imágenes con alt
  const total = input.imagesTotal ?? 0;
  const withAlt = input.imagesWithAlt ?? 0;
  const altOk = total === 0 ? true : withAlt >= total;
  push("image_alts", "Alt text de imágenes", 7, altOk,
    total === 0 ? "Sin imágenes"
    : withAlt < total ? `${total - withAlt} imagen(es) sin alt` : "OK",
    "Describe producto, marca, presentación e ingrediente en cada alt.");

  const score = b.reduce((acc, x) => acc + x.earned, 0);
  const missing = b.filter((x) => !x.ok).map((x) => x.field);
  return { score: Math.min(100, Math.max(0, score)), breakdown: b, missing };
};
