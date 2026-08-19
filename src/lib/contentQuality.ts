// Puntuación de "Calidad del contenido" para landings SEO.
// Evalúa claridad, naturalidad, utilidad, estructura, repeticiones,
// profundidad, lenguaje genérico y riesgo de afirmaciones de salud.
import { scanSensitiveClaims } from "@/lib/sensitiveClaims";

export type QualityCheck = { ok: boolean; level: "ok" | "warn" | "error"; message: string };
export type QualityResult = {
  score: number;
  checks: QualityCheck[];
  genericPhrases: string[];
  repeatedSentences: string[];
  claims: string[];
  keywordStats: { keyword: string; count: number; words: number; density: number; max: number; excess: number; high: boolean };
};

export const GENERIC_PHRASES = [
  "apoyamos tu camino",
  "descubre el poder",
  "tu bienestar es nuestra prioridad",
  "transforma tu vida",
  "una solución ideal",
  "en el mundo actual",
  "en la actualidad",
  "no es un secreto",
  "sin lugar a dudas",
  "la mejor opción del mercado",
  "calidad insuperable",
  "lo mejor para ti",
  "cambia tu vida",
  "sumérgete en",
];

const strip = (html?: string | null) =>
  String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const sentences = (t: string) =>
  t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 40);

/**
 * Peso de cada chequeo. La suma tiene que dar exactamente 100.
 *
 * Antes sumaban 110 y el total se recortaba con `Math.min(100, ...)`: una
 * landing podía fallar un chequeo, verlo marcado en rojo en la lista, y aun
 * así mostrar "100/100" porque el exceso absorbía la penalización. El test
 * `contentQuality.test.ts` vigila que la suma no vuelva a desviarse.
 */
export const PESOS = {
  intencion: 18,
  h1: 9,
  meta: 9,
  profundidad: 14,
  estructura: 9,
  faq: 9,
  temas: 4,
  nutrientes: 4,
  generico: 9,
  repeticiones: 6,
  densidad: 4,
  claims: 5,
} as const;

export const PESO_TOTAL = Object.values(PESOS).reduce((a, b) => a + b, 0);

export type QualityInput = {
  title?: string | null;
  intro?: string | null;
  bodyHtml?: string | null;
  longDescription?: string | null;
  keyword?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  faqs?: { q: string; a: string }[];
  nutrients?: { title?: string; name?: string; description?: string }[];
  ingredients?: { title?: string; name?: string; description?: string }[];
  relatedTopics?: { title?: string; name?: string; slug?: string }[];
  sectionsText?: string[];
};

export function computeContentQuality(input: QualityInput): QualityResult {
  const checks: QualityCheck[] = [];
  const add = (ok: boolean, level: "warn" | "error", message: string, okMessage: string) =>
    checks.push({ ok, level: ok ? "ok" : level, message: ok ? okMessage : message });

  const intro = strip(input.intro);
  const body = strip(input.bodyHtml);
  const extra = (input.sectionsText ?? []).map(strip).join(" ");
  const closing = strip(input.longDescription);
  const faqs = input.faqs ?? [];
  const all = [intro, body, extra, closing, faqs.map((f) => `${f.q} ${f.a}`).join(" ")].join(" ").trim();
  const nAll = norm(all);
  const words = all ? all.split(/\s+/).length : 0;

  let score = 0;

  // Intención de búsqueda respondida: intro útil y sin arranque comercial.
  const introOk = intro.length >= 120 && !GENERIC_PHRASES.some((p) => norm(intro).startsWith(norm(p)));
  if (introOk) score += PESOS.intencion; else score += intro.length >= 60 ? Math.round(PESOS.intencion / 2) : 0;
  add(introOk, "warn", "La introducción no responde de inmediato la intención de búsqueda", "Intención de búsqueda respondida");

  // H1
  const t = (input.title ?? "").trim();
  const h1Ok = t.length >= 15 && t.length <= 70;
  if (h1Ok) score += PESOS.h1;
  add(h1Ok, "warn", "H1 demasiado corto o demasiado largo", "H1 correcto");

  // Meta
  const md = (input.metaDescription ?? "").trim();
  const metaOk = md.length >= 140 && md.length <= 160 && !!(input.metaTitle ?? "").trim();
  if (metaOk) score += PESOS.meta; else if (md) score += Math.round(PESOS.meta / 2);
  add(metaOk, "warn", md ? `Meta description de ${md.length} caracteres (ideal 140-160)` : "Falta la meta description", "Meta correcta");

  // Profundidad
  const depthOk = words >= 450;
  if (depthOk) score += PESOS.profundidad;
  else score += Math.round(Math.min(words, 450) / 450 * PESOS.profundidad);
  add(depthOk, "warn", `Contenido corto (${words} palabras, ideal 450+)`, "Profundidad suficiente");

  // Estructura: subtítulos o secciones
  const headings = (String(input.bodyHtml ?? "").match(/<h[23][\s>]/gi) ?? []).length + (input.sectionsText?.filter(Boolean).length ?? 0);
  const structOk = headings >= 2;
  if (structOk) score += PESOS.estructura;
  add(structOk, "warn", "Faltan subtítulos que organicen el contenido", "Estructura clara con subtítulos");

  // FAQ
  const faqOk = faqs.filter((f) => f.q && f.a).length >= 3;
  if (faqOk) score += PESOS.faq; else score += faqs.length ? Math.round(PESOS.faq / 2) : 0;
  add(faqOk, "warn", "Añade al menos 3 preguntas frecuentes útiles", "FAQ con preguntas reales");

  // Temas relacionados
  const topicsOk = (input.relatedTopics ?? []).filter((x) => x?.slug).length >= 1;
  if (topicsOk) score += PESOS.temas;
  add(topicsOk, "warn", "Falta al menos un tema relacionado", "Temas relacionados enlazados");

  // Nutrientes vs ingredientes diferenciados
  const nut = new Set((input.nutrients ?? []).map((x) => norm(x.title || x.name || "")).filter(Boolean));
  const ing = (input.ingredients ?? []).map((x) => norm(x.title || x.name || "")).filter(Boolean);
  const dup = ing.filter((x) => nut.has(x));
  const diffOk = dup.length === 0;
  if (diffOk) score += PESOS.nutrientes;
  add(diffOk, "warn", `Ingredientes duplicados desde nutrientes (${dup.length})`, "Nutrientes e ingredientes diferenciados");

  // Lenguaje genérico
  const genericPhrases = GENERIC_PHRASES.filter((p) => nAll.includes(norm(p)));
  if (!genericPhrases.length) score += PESOS.generico;
  else score += Math.max(0, PESOS.generico - genericPhrases.length * 4);
  add(genericPhrases.length === 0, "warn", `Se detectaron ${genericPhrases.length} frase(s) genérica(s)`, "Sin frases genéricas de IA");

  // Repeticiones de frases
  const seen = new Map<string, number>();
  for (const s of sentences(all)) {
    const k = norm(s).replace(/[^a-z0-9 ]/g, "");
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const repeatedSentences = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k.slice(0, 90));
  const brandCount = (nAll.match(/nutribatidos/g) ?? []).length;
  const repOk = repeatedSentences.length === 0 && brandCount <= 4;
  if (repOk) score += PESOS.repeticiones; else score += 2;
  add(
    repOk, "warn",
    repeatedSentences.length
      ? `${repeatedSentences.length} frase(s) repetida(s)`
      : `"Nutribatidos" aparece ${brandCount} veces (máx. 4)`,
    "Sin repeticiones relevantes",
  );

  // Densidad de la palabra clave
  const kw = norm(input.keyword ?? "").trim();
  const kwRegex = kw ? new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "g") : null;
  const kwCount = kwRegex ? (nAll.match(kwRegex) ?? []).length : 0;
  const kwDensity = words > 0 ? kwCount / words : 0;
  const kwMax = Math.max(3, Math.floor(words * 0.02));
  const kwDensityHigh = !!kw && words > 0 && kwDensity > 0.025;
  const keywordStats = {
    keyword: input.keyword ?? "",
    count: kwCount,
    words,
    density: kwDensity,
    max: kwMax,
    excess: Math.max(0, kwCount - kwMax),
    high: kwDensityHigh,
  };
  if (!kwDensityHigh) score += 4;
  add(
    !kwDensityHigh, "warn",
    `La palabra clave "${input.keyword ?? ""}" aparece ${kwCount} veces en ${words} palabras (${(kwDensity * 100).toFixed(1)}%). Reduce a ${kwMax} o menos usando sinónimos y pronombres.`,
    "Densidad de palabra clave correcta",
  );


  // Claims de salud (riesgo)
  const hits = scanSensitiveClaims(all);
  const claims = [...new Set(hits.map((h) => h.match))];
  if (!claims.length) score += PESOS.claims;
  add(claims.length === 0, "error", `Revisar ${claims.length} afirmación(es) de salud`, "Sin afirmaciones de salud arriesgadas");

  // El recorte es una red de seguridad, no parte del cálculo: con PESOS
  // sumando 100 nunca debería activarse.
  return {
    score: Math.max(0, Math.min(PESO_TOTAL, Math.round(score))),
    checks,
    genericPhrases,
    repeatedSentences,
    claims,
    keywordStats,
  };
}
