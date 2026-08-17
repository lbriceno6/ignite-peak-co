// La rúbrica de SEO de producto existe dos veces: en el panel
// (src/lib/seoScore.ts, que corre en el navegador) y en el agente
// (supabase/functions/_shared/seo/rubric.ts, que corre en Deno). No se pueden
// unificar sin acoplar el build de Vite al directorio de edge functions.
//
// Esta prueba es lo que hace segura esa duplicación: si alguien cambia un
// umbral en un sitio y no en el otro, el panel y el agente empezarían a dar
// puntajes distintos para el mismo producto y aquí se rompe antes de llegar a
// producción.

import { describe, expect, it } from "vitest";
import { computeProductSeoScore, type ProductSeoInput } from "@/lib/seoScore";
import { scoreProduct } from "../../supabase/functions/_shared/seo/rubric";

const vacio: ProductSeoInput = {};

const perfecto: ProductSeoInput = {
  productName: "Proteína Whey Isolate",
  seoTitle: "Proteína Whey Isolate 2kg — sabor vainilla natural premium",
  seoDescription:
    "Proteína Whey Isolate de 2kg con sabor vainilla natural. Alta pureza, absorción rápida y sin azúcar añadida. Ideal para tu rutina diaria de entrenamiento.",
  slug: "proteina-whey-isolate-2kg",
  canonical: "/producto/proteina-whey-isolate-2kg",
  ogImage: "https://cdn.example.com/whey.jpg",
  keywords: ["proteina", "whey", "isolate", "vainilla", "suplemento"],
  tags: ["proteinas", "vainilla", "masa muscular"],
  shoppingTitle: "Proteína Whey Isolate 2kg Vainilla",
  shoppingDescription: "Proteína aislada de suero, 2kg, sabor vainilla.",
  shortDescription: "Proteína aislada de suero, sabor vainilla, 2kg.",
  longDescription:
    "La Proteína Whey Isolate aporta un perfil completo de aminoácidos con muy bajo contenido de grasa y lactosa. Se absorbe rápido y encaja bien después de entrenar o entre comidas.",
  imagesTotal: 2,
  imagesWithAlt: 2,
};

/** Casos que rozan cada umbral de la rúbrica. */
const casos: Array<[string, ProductSeoInput]> = [
  ["vacío", vacio],
  ["perfecto", perfecto],
  ["título corto", { ...perfecto, seoTitle: "Proteína Whey" }],
  ["título largo", { ...perfecto, seoTitle: "P".repeat(80) }],
  ["título sin el nombre", { ...perfecto, seoTitle: "Suplemento aislado premium de suero lácteo en polvo" }],
  ["descripción corta", { ...perfecto, seoDescription: "Corta." }],
  ["descripción larga", { ...perfecto, seoDescription: "D".repeat(200) }],
  ["slug con tildes", { ...perfecto, slug: "proteína-whey" }],
  ["sin canonical", { ...perfecto, canonical: null }],
  ["canonical inválida", { ...perfecto, canonical: "no-es-una-url" }],
  ["sin og image", { ...perfecto, ogImage: null }],
  ["pocas keywords", { ...perfecto, keywords: ["a", "b"] }],
  ["demasiadas keywords", { ...perfecto, keywords: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] }],
  ["pocos tags", { ...perfecto, tags: ["uno"] }],
  ["shopping title largo", { ...perfecto, shoppingTitle: "S".repeat(160) }],
  ["sin shopping description", { ...perfecto, shoppingDescription: null }],
  ["descripción corta muy larga", { ...perfecto, shortDescription: "L".repeat(120) }],
  ["descripción larga muy corta", { ...perfecto, longDescription: "Breve." }],
  ["imágenes sin alt", { ...perfecto, imagesTotal: 3, imagesWithAlt: 1 }],
  ["sin imágenes", { ...perfecto, imagesTotal: 0, imagesWithAlt: 0 }],
];

describe("la rúbrica del agente coincide con la del panel", () => {
  it.each(casos)("mismo puntaje para: %s", (_nombre, input) => {
    const panel = computeProductSeoScore(input);
    const agente = scoreProduct(input);
    expect(agente.score).toBe(panel.score);
  });

  it.each(casos)("mismos campos fallando para: %s", (_nombre, input) => {
    const panel = computeProductSeoScore(input);
    const agente = scoreProduct(input);
    expect(agente.failing.map((f) => f.field).sort()).toEqual([...panel.missing].sort());
  });

  it("un producto completo saca 100", () => {
    expect(scoreProduct(perfecto).score).toBe(100);
  });

  // Peculiaridad heredada de la rúbrica del panel: el criterio de alt text es
  // "ninguna imagen se quedó sin alt", así que un producto sin imágenes lo
  // cumple por vacuidad y se lleva sus 7 puntos. No es un error de la copia
  // — se comporta igual en los dos lados — pero conviene tenerlo anotado.
  it("un producto vacío arrastra los 7 puntos de alt text", () => {
    expect(scoreProduct(vacio).score).toBe(7);
    expect(computeProductSeoScore(vacio).score).toBe(7);
  });
});
