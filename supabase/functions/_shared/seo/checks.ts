// Comprobaciones puras de la auditoría de SEO.
//
// Aquí no se toca la base de datos ni la red: entra data, sale diagnóstico.
// Está separado de `audit.ts` para que se pueda probar desde el frontend con
// vitest — `audit.ts` importa el cliente de Supabase por URL, que es sintaxis
// de Deno y TypeScript no puede resolver desde el build de Vite.

import type { SeoScore } from "./rubric.ts";

/** Cuántos ejemplos se adjuntan por hallazgo. */
export const EXAMPLES = 8;

export type EntityFamily = "producto" | "categoria" | "landing" | "blog";

export type ScoredEntity = {
  family: EntityFamily;
  id: string;
  name: string;
  slug: string | null;
  score: number;
  /** Campos que fallan, por etiqueta. */
  failing: string[];
};

export type Finding = {
  /** Clave estable del hallazgo. */
  key: string;
  /** Qué pasa, en lenguaje de negocio. */
  titulo: string;
  /** Cuántas entidades lo sufren. */
  afectados: number;
  /** Cómo se arregla. */
  arreglo: string;
  ejemplos: string[];
};

export const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const NOMBRE_FAMILIA: Record<EntityFamily, string> = {
  producto: "producto(s)",
  categoria: "categoría(s)",
  landing: "landing(s)",
  blog: "artículo(s)",
};

/**
 * Agrupa los campos que fallan de una familia en hallazgos con ejemplos.
 *
 * El título del grupo describe el campo, no el caso concreto: dentro de un
 * mismo campo cada página falla por su motivo (uno lo tiene corto, otro largo,
 * otro no lo tiene). El motivo específico viaja en cada ejemplo.
 */
export function foldIssues(
  family: EntityFamily,
  rows: { entity: ScoredEntity; score: SeoScore }[],
): Finding[] {
  const buckets = new Map<string, {
    label: string;
    arreglo: string;
    ejemplos: string[];
    afectados: number;
  }>();

  for (const { entity, score } of rows) {
    for (const issue of score.failing) {
      const key = `${family}:${issue.field}`;
      let b = buckets.get(key);
      if (!b) {
        b = { label: issue.label, arreglo: issue.fix, ejemplos: [], afectados: 0 };
        buckets.set(key, b);
      }
      b.afectados++;
      if (b.ejemplos.length < EXAMPLES) {
        b.ejemplos.push(`${entity.name} — ${issue.message}`);
      }
    }
  }

  return [...buckets.entries()]
    .map(([key, b]) => ({
      key,
      titulo: `${b.label}: ${b.afectados} ${NOMBRE_FAMILIA[family]} con problemas`,
      afectados: b.afectados,
      arreglo: b.arreglo,
      ejemplos: b.ejemplos,
    }))
    .sort((a, b) => b.afectados - a.afectados);
}

/** Detecta valores repetidos entre entidades: Google los trata como duplicados. */
export function findDuplicates(
  label: string,
  entries: { value: string | null | undefined; who: string }[],
): Finding | null {
  const map = new Map<string, string[]>();
  for (const e of entries) {
    const v = norm(e.value);
    if (!v) continue;
    const arr = map.get(v) ?? [];
    arr.push(e.who);
    map.set(v, arr);
  }
  const dups = [...map.entries()].filter(([, who]) => who.length > 1);
  if (dups.length === 0) return null;

  return {
    key: `duplicado:${label}`,
    titulo: `${dups.length} ${label} repetidos en más de una página`,
    afectados: dups.reduce((a, [, who]) => a + who.length, 0),
    arreglo:
      "Cada página necesita un texto único. Google elige una y esconde el resto, así que las páginas repetidas compiten entre ellas.",
    ejemplos: dups.slice(0, EXAMPLES).map(([v, who]) =>
      `"${v.slice(0, 60)}" en: ${who.slice(0, 3).join(", ")}${who.length > 3 ? ` (+${who.length - 3})` : ""}`
    ),
  };
}

export type RedirectRow = {
  from_path?: string | null;
  to_path?: string | null;
  active?: boolean | null;
};

/**
 * Revisa las redirecciones activas.
 *
 *   - bucle: la ruta apunta a sí misma, dejando la página inaccesible.
 *   - cadena: el destino es a su vez el origen de otra redirección. Cada salto
 *     diluye autoridad y suma latencia; Google además deja de seguirlas
 *     después de unos pocos saltos.
 */
export function analyzeRedirects(
  redirects: RedirectRow[],
): { loops: string[]; chains: string[] } {
  const activos = redirects.filter((r) => r.active !== false);
  const origenes = new Set(
    activos.map((r) => String(r.from_path ?? "").trim()).filter(Boolean),
  );

  const loops: string[] = [];
  const chains: string[] = [];

  for (const r of activos) {
    const from = String(r.from_path ?? "").trim();
    const to = String(r.to_path ?? "").trim();
    if (!from || !to) continue;
    if (from === to) loops.push(`${from} apunta a sí misma`);
    else if (origenes.has(to)) chains.push(`${from} → ${to} → ...`);
  }

  return { loops, chains };
}
