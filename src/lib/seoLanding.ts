// Tipos y utilidades compartidas para las landings SEO (públicas + admin).
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

export function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
