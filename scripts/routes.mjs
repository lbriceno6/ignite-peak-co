// Rutas públicas compartidas por los scripts de build (sitemap y prerender).
//
// Se duplica el mapa de `src/lib/seoLanding.ts` a propósito: estos scripts
// corren fuera de Vite, donde el alias `@/` no está resuelto, y una ruta mal
// construida aquí se traduce en un sitemap que anuncia URLs que dan 404.

/** El segmento de URL público de cada tipo de landing. */
export const KIND_PATH = {
  objetivo: "objetivo",
  ingrediente: "ingrediente",
  beneficio: "beneficio",
  problema: "salud",
};

/**
 * Ruta pública de una landing.
 *
 * El sitemap la construía como `/${kind}/${slug}`, que para `kind: "problema"`
 * daba `/problema/<slug>` — una ruta que no existe en App.tsx, donde ese tipo
 * vive en `/salud/:slug`.
 */
export const landingPath = (kind, slug) => `/${KIND_PATH[kind] ?? kind}/${slug}`;
