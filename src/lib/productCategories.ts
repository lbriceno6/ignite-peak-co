// Taxonomy de categorías y subcategorías para productos Nutribatidos.
// Estructura tipo iHerb / Organa: 1 categoría principal + 1 subcategoría.

export const categoryData: Record<string, string[]> = {
  "Productos": [
    "Nutribatidos",
    "Superfoods Andinos",
    "Proteínas y Colágeno",
    "Semillas y Cereales",
    "Plantas Naturales",
    "Aceites Naturales",
  ],
  "Para tu salud": [
    "Próstata y Salud Masculina",
    "Hígado y Limpieza Natural",
    "Digestión y Colon",
    "Articulaciones y Huesos",
    "Control de Peso",
    "Defensas e Inmunidad",
    "Corazón y Circulación",
    "Riñones y Vías Urinarias",
    "Piel, Cabello y Uñas",
    "Energía y Vitalidad",
  ],
  "Promociones": [
    "Combos",
    "Ofertas",
    "Más vendidos",
    "Nuevos productos",
  ],
};

export const mainCategories = Object.keys(categoryData);

export const slugifyCategory = (s: string): string =>
  s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Mapas slug → nombre para resolver desde la URL.
export const mainBySlug: Record<string, string> = Object.fromEntries(
  mainCategories.map((c) => [slugifyCategory(c), c]),
);

export const subBySlug: Record<string, Record<string, string>> = Object.fromEntries(
  mainCategories.map((c) => [
    slugifyCategory(c),
    Object.fromEntries(categoryData[c].map((s) => [slugifyCategory(s), s])),
  ]),
);

export const getSubcategories = (main?: string | null): string[] =>
  main && categoryData[main] ? categoryData[main] : [];
