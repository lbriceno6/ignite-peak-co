// Pruebas de la puntuación SEO que muestra la lista de landings del admin.
//
// El fallo que motivó estas pruebas: dos de los ocho criterios leían campos
// que nunca llegaban (`keywords`, que no existe en la tabla, y los datos de
// imágenes, que no se pasaban). El techo real era 75, así que el botón
// "Optimizar SEO con IA (score < 80)" señalaba todas las landings para
// siempre y las remandaba a la IA aunque estuvieran impecables.

import { describe, expect, it } from "vitest";
import { landingKeywords, landingSeoScore } from "@/lib/seoLanding";

// Fila de seo_landing_pages con todos los campos que puntúan bien puestos.
const landingCompleta = {
  title: "Vitaminas",
  meta_title: "Vitaminas esenciales: para qué sirven y cómo tomarlas bien",
  meta_description:
    "Guía clara sobre vitaminas esenciales: para qué sirve cada una, en qué alimentos " +
    "están y cómo combinarlas en el día a día sin excesos ni carencias.",
  slug: "vitaminas",
  keyword: "vitaminas",
  keyword_secondary: ["vitamina c", "vitamina d", "complejo b"],
  og_image: "https://cdn.ejemplo/vitaminas.jpg",
  hero_image: "https://cdn.ejemplo/vitaminas.jpg",
  hero_image_alt: "Frutas y verduras ricas en vitaminas sobre una mesa",
  schema_jsonld: { "@type": "FAQPage" },
  faqs: [{ q: "¿Cuáles son esenciales?", a: "Las que el cuerpo no fabrica." }],
  intro: "Una introducción útil que responde de inmediato.",
  body_html: "<p>Cuerpo del artículo.</p>",
  long_description: "Cierre con el resumen.",
};

describe("landingKeywords", () => {
  it("junta la principal con las secundarias", () => {
    expect(landingKeywords(landingCompleta)).toEqual([
      "vitaminas", "vitamina c", "vitamina d", "complejo b",
    ]);
  });

  it("no lee la columna inexistente `keywords`", () => {
    // Si alguien vuelve a apoyarse en `keywords`, esto lo delata.
    expect(landingKeywords({ keywords: ["a", "b", "c"] })).toEqual([]);
  });

  it("aguanta filas a medias sin reventar", () => {
    expect(landingKeywords({})).toEqual([]);
    expect(landingKeywords({ keyword: "  ", keyword_secondary: null })).toEqual([]);
    expect(landingKeywords({ keyword: "avena" })).toEqual(["avena"]);
  });
});

describe("landingSeoScore", () => {
  it("una landing completa llega a 100", () => {
    expect(landingSeoScore(landingCompleta)).toBe(100);
  });

  it("queda por encima del umbral de 80 que usa el botón de optimizar", () => {
    expect(landingSeoScore(landingCompleta)).toBeGreaterThanOrEqual(80);
  });

  it("sin palabras clave pierde exactamente esos puntos", () => {
    const sinKw = { ...landingCompleta, keyword: null, keyword_secondary: [] };
    expect(landingSeoScore(sinKw)).toBe(90);
  });

  it("la portada sin alt pierde exactamente esos puntos", () => {
    const sinAlt = { ...landingCompleta, hero_image_alt: "" };
    expect(landingSeoScore(sinAlt)).toBe(85);
  });

  it("una landing vacía puntúa bajo", () => {
    expect(landingSeoScore({})).toBeLessThan(50);
  });
});
