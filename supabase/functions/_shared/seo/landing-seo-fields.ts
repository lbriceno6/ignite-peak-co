// Validación y auto-corrección de campos SEO de landings (title, description, keywords).
// Se valida por código (conteo de caracteres), no solo por prompt.

export const TITLE_MIN = 50;
export const TITLE_MAX = 60;
export const DESC_MIN = 148;
export const DESC_MAX = 170;
export const DESC_TARGET_MIN = 155;
export const DESC_TARGET_MAX = 160;

export type SeoFields = {
  meta_title: string | null;
  meta_description: string | null;
  keyword: string | null;
  keyword_secondary: string[];
};

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ") : null);

export const titleOk = (v?: string | null) => {
  const n = (v ?? "").trim().length;
  return n >= TITLE_MIN && n <= TITLE_MAX;
};

export const descOk = (v?: string | null) => {
  const n = (v ?? "").trim().length;
  return n >= DESC_MIN && n <= DESC_MAX;
};

export const normalizeSecondary = (v: unknown, primary?: string | null): string[] => {
  const p = (primary ?? "").trim().toLowerCase();
  const list = (Array.isArray(v) ? v : [])
    .map((k) => String(k ?? "").trim().toLowerCase())
    .filter((k) => k && k !== p);
  return [...new Set(list)].slice(0, 5);
};

type AskFn = (prompt: string) => Promise<any>;

/**
 * Asegura SEO title (50-60), meta description (148-170), keyword principal
 * y 3-5 secundarias. Corrige con IA como máximo 2 veces por campo.
 */
export async function ensureSeoFields(
  ask: AskFn,
  opts: {
    keyword: string;
    h1?: string | null;
    context?: string;
    current?: Partial<SeoFields>;
  },
): Promise<SeoFields> {
  const brand = "Nutribatidos";
  let metaTitle = clean(opts.current?.meta_title);
  let metaDescription = clean(opts.current?.meta_description);
  let primary = clean(opts.current?.keyword) ?? clean(opts.keyword);
  let secondary = normalizeSecondary(opts.current?.keyword_secondary, primary);

  const baseCtx = `Palabra clave principal: ${primary ?? opts.keyword}
H1: ${opts.h1 ?? ""}
Contexto: ${(opts.context ?? "").slice(0, 1200)}`;

  // --- Generar lo que falte (una sola llamada) ---
  const needTitle = !titleOk(metaTitle);
  const needDesc = !descOk(metaDescription);
  const needKw = !primary || secondary.length < 3;

  if (needTitle || needDesc || needKw) {
    const out = await ask(`Genera/corrige los campos SEO de esta landing de ${brand} (Perú).
${baseCtx}
SEO title actual: ${metaTitle ?? "(vacío)"} (${(metaTitle ?? "").length} caracteres)
Meta description actual: ${metaDescription ?? "(vacío)"} (${(metaDescription ?? "").length} caracteres)

REGLAS ESTRICTAS:
- "meta_title": entre ${TITLE_MIN} y ${TITLE_MAX} caracteres CONTANDO espacios. Debe incluir la palabra clave de forma natural, orientarse a la búsqueda real, NO copiar el H1 y no ser genérico. Puede terminar con " | ${brand}" si cabe.
- "meta_description": entre ${DESC_MIN} y ${DESC_MAX} caracteres (ideal ${DESC_TARGET_MIN}-${DESC_TARGET_MAX}), con la palabra clave integrada de forma natural, explicando qué encontrará el usuario. Prohibidas frases genéricas tipo "tu bienestar es nuestra prioridad". Sin keyword stuffing.
- "keyword": 1 palabra clave principal.
- "keyword_secondary": entre 3 y 5 palabras clave secundarias reales de búsqueda, distintas de la principal.

Devuelve JSON EXACTO: {"meta_title":"","meta_description":"","keyword":"","keyword_secondary":[]}`);

    if (needTitle && clean(out?.meta_title)) metaTitle = clean(out.meta_title);
    if (needDesc && clean(out?.meta_description)) metaDescription = clean(out.meta_description);
    if (!primary) primary = clean(out?.keyword) ?? clean(opts.keyword);
    if (secondary.length < 3) {
      const merged = [...secondary, ...normalizeSecondary(out?.keyword_secondary, primary)];
      secondary = normalizeSecondary(merged, primary);
    }
  }

  // --- Reintentos de corrección de longitud (máx. 2 por campo) ---
  for (let i = 0; i < 2 && !titleOk(metaTitle); i++) {
    const len = (metaTitle ?? "").length;
    const out = await ask(`Corrige este SEO title para que tenga entre ${TITLE_MIN} y ${TITLE_MAX} caracteres exactos contando espacios.
Actual (${len} caracteres): "${metaTitle ?? ""}"
Palabra clave: ${primary}
${len > TITLE_MAX ? "Acórtalo" : "Amplíalo"} sin perder la palabra clave ni la intención de búsqueda. No copies el H1.
Devuelve JSON EXACTO: {"meta_title":""}`);
    const next = clean(out?.meta_title);
    if (!next) break;
    metaTitle = next;
  }

  for (let i = 0; i < 2 && !descOk(metaDescription); i++) {
    const len = (metaDescription ?? "").length;
    const out = await ask(`Corrige esta meta description para que tenga entre ${DESC_MIN} y ${DESC_MAX} caracteres exactos contando espacios (ideal ${DESC_TARGET_MIN}-${DESC_TARGET_MAX}).
Actual (${len} caracteres): "${metaDescription ?? ""}"
Palabra clave: ${primary}
${len > DESC_MAX ? "Acórtala" : "Amplíala con información útil concreta"}. Sin frases genéricas ni keyword stuffing.
Devuelve JSON EXACTO: {"meta_description":""}`);
    const next = clean(out?.meta_description);
    if (!next) break;
    metaDescription = next;
  }

  // Último recurso determinista: recorte duro si sigue fuera de rango por exceso.
  if (metaTitle && metaTitle.length > TITLE_MAX) {
    metaTitle = metaTitle.slice(0, TITLE_MAX).replace(/[\s|,–-]+$/, "");
  }
  if (metaDescription && metaDescription.length > DESC_MAX) {
    const cut = metaDescription.slice(0, DESC_MAX);
    const dot = cut.lastIndexOf(". ");
    metaDescription = (dot > DESC_MIN ? cut.slice(0, dot + 1) : cut.replace(/[\s,;:-]+$/, "")).trim();
  }

  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
    keyword: primary,
    keyword_secondary: secondary,
  };
}
