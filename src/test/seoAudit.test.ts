// Pruebas de la lógica pura de la auditoría de SEO.
//
// Estas comprobaciones no necesitan base de datos, así que se pueden verificar
// aquí en vez de descubrir los fallos en producción. Son justo las partes
// donde es fácil equivocarse: comparar textos normalizados y seguir saltos
// entre redirecciones.

import { describe, expect, it } from "vitest";
import {
  analyzeRedirects,
  contarCobertura,
  findDuplicates,
  foldIssues,
  sinCobertura,
} from "../../supabase/functions/_shared/seo/checks";

describe("contarCobertura", () => {
  it("cuenta cubierta la página que tiene título o descripción", () => {
    const r = contarCobertura([
      { metaTitle: "Creatina monohidrato", metaDescription: null },
      { metaTitle: null, metaDescription: "La mejor creatina del Perú" },
      { metaTitle: "Proteína whey", metaDescription: "Proteína aislada" },
    ]);
    expect(r.conSeo).toBe(3);
    expect(r.sinSeo).toBe(0);
  });

  it("una fila existente pero vacía no cuenta como cubierta", () => {
    // El fallo que inflaba el informe: la fila de seo_meta existía y se daba
    // el producto por cubierto aunque no tuviera nada escrito.
    const r = contarCobertura([
      { metaTitle: "", metaDescription: "" },
      { metaTitle: "   ", metaDescription: null },
      { metaTitle: undefined, metaDescription: undefined },
    ]);
    expect(r.conSeo).toBe(0);
    expect(r.sinSeo).toBe(3);
  });

  it("los dos números siempre suman el total", () => {
    const filas = [
      { metaTitle: "uno", metaDescription: null },
      { metaTitle: null, metaDescription: null },
      { metaTitle: null, metaDescription: "tres" },
    ];
    const r = contarCobertura(filas);
    expect(r.conSeo! + r.sinSeo!).toBe(filas.length);
  });

  it("sin filas no divide entre cero", () => {
    expect(contarCobertura([])).toMatchObject({ conSeo: 0, sinSeo: 0 });
  });

  it("mide lo mismo para cualquier familia: el criterio es único", () => {
    const misma = [{ metaTitle: "x", metaDescription: null }];
    expect(contarCobertura(misma).criterio).toBe(contarCobertura(misma).criterio);
    expect(contarCobertura(misma).criterio).toMatch(/meta título o meta descripción/);
  });
});

describe("sinCobertura", () => {
  it("no responde con un número cuando la pregunta no aplica", () => {
    // El blog no tiene campos de SEO: antes se rellenaba con "tiene extracto"
    // y el informe lo presentaba como "el 83% del blog tiene SEO".
    const r = sinCobertura("no aplica: los artículos no tienen campos de SEO propios");
    expect(r.conSeo).toBeNull();
    expect(r.sinSeo).toBeNull();
    expect(r.criterio).toContain("no aplica");
  });
});

describe("findDuplicates", () => {
  it("no reporta nada cuando todo es único", () => {
    expect(findDuplicates("títulos", [
      { value: "Proteína whey", who: "producto A" },
      { value: "Creatina monohidrato", who: "producto B" },
    ])).toBeNull();
  });

  it("ignora vacíos y nulos: no tener título no es tenerlo duplicado", () => {
    expect(findDuplicates("títulos", [
      { value: null, who: "producto A" },
      { value: "", who: "producto B" },
      { value: "   ", who: "producto C" },
      { value: undefined, who: "producto D" },
    ])).toBeNull();
  });

  it("detecta repetidos aunque cambien mayúsculas, tildes o espacios", () => {
    const r = findDuplicates("títulos", [
      { value: "Proteína  Whey", who: "producto A" },
      { value: "proteina whey", who: "producto B" },
      { value: "PROTEÍNA WHEY", who: "producto C" },
    ]);
    expect(r).not.toBeNull();
    expect(r!.afectados).toBe(3);
  });

  it("cuenta las páginas implicadas, no los textos repetidos", () => {
    const r = findDuplicates("títulos", [
      { value: "uno", who: "A" }, { value: "uno", who: "B" },
      { value: "dos", who: "C" }, { value: "dos", who: "D" },
      { value: "único", who: "E" },
    ]);
    expect(r!.afectados).toBe(4);
    expect(r!.titulo).toContain("2");
  });
});

describe("analyzeRedirects", () => {
  it("detecta una ruta que apunta a sí misma", () => {
    const { loops, chains } = analyzeRedirects([
      { from_path: "/oferta", to_path: "/oferta", active: true },
    ]);
    expect(loops).toHaveLength(1);
    expect(chains).toHaveLength(0);
  });

  it("detecta una cadena de redirecciones", () => {
    const { chains } = analyzeRedirects([
      { from_path: "/a", to_path: "/b", active: true },
      { from_path: "/b", to_path: "/c", active: true },
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0]).toContain("/a");
  });

  it("no cuenta una redirección simple como cadena", () => {
    const { loops, chains } = analyzeRedirects([
      { from_path: "/viejo", to_path: "/nuevo", active: true },
    ]);
    expect(loops).toHaveLength(0);
    expect(chains).toHaveLength(0);
  });

  it("ignora las redirecciones desactivadas", () => {
    const { loops, chains } = analyzeRedirects([
      { from_path: "/a", to_path: "/a", active: false },
      { from_path: "/b", to_path: "/c", active: false },
      { from_path: "/c", to_path: "/d", active: true },
    ]);
    expect(loops).toHaveLength(0);
    expect(chains).toHaveLength(0);
  });

  it("trata active nulo como activa: es el valor por defecto de la tabla", () => {
    const { loops } = analyzeRedirects([
      { from_path: "/x", to_path: "/x", active: null },
    ]);
    expect(loops).toHaveLength(1);
  });

  it("no revienta con filas incompletas", () => {
    const { loops, chains } = analyzeRedirects([
      { from_path: null, to_path: "/a", active: true },
      { from_path: "/b", to_path: null, active: true },
      {},
    ]);
    expect(loops).toHaveLength(0);
    expect(chains).toHaveLength(0);
  });
});

describe("foldIssues", () => {
  const fila = (nombre: string, mensaje: string) => ({
    entity: {
      family: "producto" as const,
      id: nombre, name: nombre, slug: nombre, score: 0, failing: ["Título SEO"],
    },
    score: {
      score: 0,
      issues: [],
      failing: [{
        field: "seo_title", label: "Título SEO", weight: 12,
        ok: false, message: mensaje, fix: "Escribe un título de 45-60 caracteres.",
      }],
    },
  });

  it("agrupa por campo y cuenta cuántas páginas fallan", () => {
    const out = foldIssues("producto", [
      fila("Whey", "Falta el título SEO"),
      fila("Creatina", "Título muy corto (20, ideal 45-60)"),
      fila("BCAA", "Título muy largo (80, máx 60)"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].afectados).toBe(3);
  });

  // Esta es la razón de ser de la prueba: el título del grupo describía antes
  // el caso del primer producto, con sus números concretos. Leer "Título muy
  // corto (20)" sobre un grupo de 40 productos es engañoso.
  it("el título del grupo no copia el problema concreto de una página", () => {
    const out = foldIssues("producto", [
      fila("Whey", "Título muy corto (20, ideal 45-60)"),
      fila("Creatina", "Falta el título SEO"),
    ]);
    expect(out[0].titulo).not.toContain("20");
    expect(out[0].titulo).toContain("Título SEO");
    expect(out[0].titulo).toContain("2");
  });

  it("cada ejemplo conserva su propio motivo", () => {
    const out = foldIssues("producto", [
      fila("Whey", "Falta el título SEO"),
      fila("Creatina", "Título muy corto (20, ideal 45-60)"),
    ]);
    expect(out[0].ejemplos[0]).toBe("Whey — Falta el título SEO");
    expect(out[0].ejemplos[1]).toContain("Creatina");
    expect(out[0].ejemplos[1]).toContain("muy corto");
  });

  it("ordena de más afectados a menos", () => {
    const conCampo = (nombre: string, field: string, label: string) => ({
      entity: {
        family: "producto" as const,
        id: nombre, name: nombre, slug: nombre, score: 0, failing: [label],
      },
      score: {
        score: 0, issues: [],
        failing: [{ field, label, weight: 8, ok: false, message: "x", fix: "y" }],
      },
    });
    const out = foldIssues("producto", [
      conCampo("A", "slug", "Slug"),
      conCampo("B", "tags", "Tags"),
      conCampo("C", "tags", "Tags"),
    ]);
    expect(out[0].titulo).toContain("Tags");
    expect(out[0].afectados).toBe(2);
  });
});
