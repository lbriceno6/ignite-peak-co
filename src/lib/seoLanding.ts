// Tipos y utilidades compartidas para las landings SEO (públicas + admin).
import { computeSeoScore } from "@/lib/seoScore";

export type LandingKind = "objetivo" | "ingrediente" | "beneficio" | "problema";

export const LANDING_KINDS: { value: LandingKind; label: string }[] = [
  { value: "objetivo", label: "Objetivo" },
  { value: "ingrediente", label: "Ingrediente" },
  { value: "beneficio", label: "Beneficio / Categoría" },
  { value: "problema", label: "Problema / Necesidad" },
];

export const KIND_LABEL: Record<string, string> = Object.fromEntries(
  LANDING_KINDS.map((k) => [k.value, k.label]),
);

/** El segmento de URL público de cada tipo (no cambia las rutas ya indexadas). */
export const KIND_PATH: Record<string, string> = {
  objetivo: "objetivo",
  ingrediente: "ingrediente",
  beneficio: "beneficio",
  problema: "salud",
};

export const landingPath = (kind: string, slug: string) => `/${KIND_PATH[kind] ?? kind}/${slug}`;

export const KIND_TO_FIELD: Record<string, string> = {
  objetivo: "goal",
  ingrediente: "main_ingredient",
  beneficio: "category",
  problema: "category",
};

export type NamedItem = { title?: string; name?: string; description?: string; icon?: string; slug?: string; href?: string; cta?: string };

export type LandingSections = {
  what_is?: { title?: string; content?: string };
  causes?: NamedItem[];
  symptoms?: NamedItem[];
  what_to_do?: string;
  nutrition?: string;
  nutrients?: NamedItem[];
  ingredients?: NamedItem[];
  related_topics?: NamedItem[];
  professional_help?: string;
};

const arr = (v: any): NamedItem[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

export function normalizeSections(raw: any): LandingSections {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    what_is: s.what_is && typeof s.what_is === "object" ? s.what_is : s.what_is ? { content: String(s.what_is) } : undefined,
    causes: arr(s.causes),
    symptoms: arr(s.symptoms),
    what_to_do: typeof s.what_to_do === "string" ? s.what_to_do : undefined,
    nutrition: typeof s.nutrition === "string" ? s.nutrition : undefined,
    nutrients: arr(s.nutrients),
    ingredients: arr(s.ingredients),
    related_topics: arr(s.related_topics),
    professional_help: typeof s.professional_help === "string" ? s.professional_help : undefined,
  };
}

export const itemLabel = (i: NamedItem) => i.title || i.name || "";

/**
 * Palabras clave de una landing: la principal más las secundarias.
 *
 * El panel leía `p.keywords`, una columna que no existe en
 * `seo_landing_pages` — los campos reales son `keyword` (texto) y
 * `keyword_secondary` (array). Al llegar siempre `undefined`, los 10 puntos
 * de este criterio no se podían ganar nunca.
 */
export const landingKeywords = (p: any): string[] => {
  const secundarias = Array.isArray(p?.keyword_secondary) ? p.keyword_secondary.map(String) : [];
  return [String(p?.keyword ?? ""), ...secundarias].map((k) => k.trim()).filter(Boolean);
};

/**
 * Puntuación SEO de una landing tal como la muestra la lista del admin.
 *
 * La landing tiene una sola imagen propia (la de portada), así que el criterio
 * de alt text se mide sobre ella. Antes no se pasaba ningún dato de imágenes y
 * la rúbrica trata "0 imágenes" como 0 puntos, así que esos 15 tampoco se
 * podían ganar.
 *
 * Entre los dos huecos el techo real era 75: ninguna landing, por completa que
 * estuviera, llegaba al umbral de 80 del botón "Optimizar SEO con IA", que por
 * tanto las señalaba todas para siempre.
 */
export const landingSeoScore = (p: any): number => {
  const imagen = p?.hero_image ?? p?.og_image;
  return computeSeoScore({
    title: p?.meta_title ?? p?.title,
    description: p?.meta_description,
    slug: p?.slug,
    keywords: landingKeywords(p),
    ogImage: p?.og_image ?? p?.hero_image,
    imagesTotal: imagen ? 1 : 0,
    imagesWithAlt: imagen && String(p?.hero_image_alt ?? "").trim() ? 1 : 0,
    hasJsonLd: !!p?.schema_jsonld || (Array.isArray(p?.faqs) && p.faqs.length > 0),
    hasShortDescription: !!p?.intro,
    hasLongDescription: !!(p?.body_html || p?.long_description),
  }).score;
};

export function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
