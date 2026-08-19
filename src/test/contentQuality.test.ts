// Pruebas de la puntuación de "Calidad del contenido" de las landings SEO.
//
// El fallo que motivó estas pruebas: los pesos sumaban 110 y el total se
// recortaba a 100, así que el panel marcaba un chequeo en rojo y a la vez
// mostraba "100/100". Lo que se vigila aquí es que la puntuación sea honesta:
// 100 solo cuando no falla nada, y que cada fallo se note.

import { describe, expect, it } from "vitest";
import { PESOS, PESO_TOTAL, computeContentQuality, type QualityInput } from "@/lib/contentQuality";

// Landing que pasa todos los chequeos, para usarla como punto de partida.
// Sin repetir la palabra clave en el cuerpo: el chequeo de densidad la limita
// al 2,5%, y un fixture que la repita en cada párrafo fallaría por sí solo.
const parrafo = (n: number) =>
  `Este cereal aporta fibra soluble y ayuda a sostener la energía durante la mañana ${n}. ` +
  `Conviene combinarlo con una fuente de proteína para que la digestión sea más lenta y ${n}. `;

const cuerpo = Array.from({ length: 12 }, (_, i) => `<h2>Sección ${i}</h2><p>${parrafo(i)}</p>`).join("");

const landingCorrecta: QualityInput = {
  title: "Avena para el desayuno: cómo usarla",
  intro:
    "La avena funciona bien en el desayuno porque libera energía de forma gradual y sacia " +
    "durante varias horas. Aquí verás cuánta usar, con qué combinarla y qué esperar en la " +
    "práctica, sin promesas exageradas.",
  bodyHtml: cuerpo,
  longDescription: "Un cierre breve con el resumen de lo anterior y las cantidades sugeridas.",
  keyword: "avena",
  metaTitle: "Avena para el desayuno",
  metaDescription:
    "Cómo usar la avena en el desayuno: cuánta poner, con qué combinarla y qué cambia en la " +
    "práctica según la cantidad. Guía breve y sin promesas exageradas hoy.",
  faqs: [
    { q: "¿Cuánta avena por porción?", a: "Entre 40 y 60 gramos según la actividad del día." },
    { q: "¿Se puede dejar remojando?", a: "Sí, toda la noche en frío funciona bien." },
    { q: "¿Con qué se combina?", a: "Con yogur, leche o una fuente de proteína." },
  ],
  nutrients: [{ title: "Fibra" }],
  ingredients: [{ title: "Hojuelas" }],
  relatedTopics: [{ title: "Desayunos", slug: "desayunos" }],
  sectionsText: ["Qué es", "Cómo usarla"],
};

describe("pesos de la puntuación", () => {
  it("suman exactamente 100", () => {
    expect(PESO_TOTAL).toBe(100);
  });

  it("una landing sin fallos llega a 100", () => {
    const r = computeContentQuality(landingCorrecta);
    // Si esto falla, mira qué chequeo se rompió antes de tocar los pesos.
    expect(r.checks.filter((c) => !c.ok).map((c) => c.message)).toEqual([]);
    expect(r.score).toBe(100);
  });
});

describe("la puntuación baja cuando algo falla", () => {
  it("un solo fallo ya deja de mostrar 100", () => {
    // Sin temas relacionados: el chequeo más barato de todos.
    const r = computeContentQuality({ ...landingCorrecta, relatedTopics: [] });
    expect(r.checks.some((c) => !c.ok)).toBe(true);
    expect(r.score).toBe(100 - PESOS.temas);
  });

  it("el exceso de palabra clave se descuenta de verdad", () => {
    // Repetir "avena" hasta pasar el 2,5% de densidad.
    const relleno = " avena".repeat(60);
    const r = computeContentQuality({
      ...landingCorrecta,
      longDescription: `${landingCorrecta.longDescription}${relleno}`,
    });
    expect(r.keywordStats.high).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it("ningún chequeo en rojo puede convivir con un 100", () => {
    const casos: QualityInput[] = [
      { ...landingCorrecta, title: "Corto" },
      { ...landingCorrecta, metaDescription: "" },
      { ...landingCorrecta, faqs: [] },
      { ...landingCorrecta, relatedTopics: [] },
      { ...landingCorrecta, sectionsText: [], bodyHtml: "<p>Un párrafo suelto.</p>" },
      { ...landingCorrecta, ingredients: [{ title: "Fibra" }] },
      { ...landingCorrecta, intro: "Muy corta." },
    ];
    for (const caso of casos) {
      const r = computeContentQuality(caso);
      if (r.checks.some((c) => !c.ok)) expect(r.score).toBeLessThan(100);
    }
  });
});
