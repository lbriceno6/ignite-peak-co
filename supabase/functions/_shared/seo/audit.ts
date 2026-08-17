// Auditoría de SEO de todo el sitio.
//
// Todo lo que hay aquí es determinista: consultas y comparaciones. El modelo
// nunca recorre el catálogo — recibe este informe ya resumido y su trabajo es
// priorizar y explicar. Es lo que hace viable auditar cientos de páginas sin
// que el coste se dispare ni el modelo alucine cifras.
//
// El informe se mantiene compacto a propósito: recuentos siempre, ejemplos
// acotados. Volcar cada fila haría que el modelo se quedara sin contexto justo
// cuando toca razonar.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  type CategorySeoInput,
  type LandingSeoInput,
  type ProductSeoInput,
  scoreCategory,
  scoreLanding,
  scoreProduct,
  type SeoScore,
} from "./rubric.ts";

/** Cuántos ejemplos se adjuntan por hallazgo. */
const EXAMPLES = 8;
/** Tope de filas por consulta, para no traer el catálogo entero sin querer. */
const ROW_LIMIT = 2000;

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

export type FamilySummary = {
  family: EntityFamily;
  total: number;
  /** Con algún dato de SEO cargado. */
  conSeo: number;
  sinSeo: number;
  scorePromedio: number;
  bien: number;      // >= 80
  regular: number;   // 50-79
  mal: number;       // < 50
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

export type SeoAuditReport = {
  generado_en: string;
  resumen: FamilySummary[];
  /** Problemas de contenido agregados por campo, ordenados por impacto. */
  problemas_de_contenido: Finding[];
  /** Problemas técnicos: duplicados, redirecciones, indexación. */
  problemas_tecnicos: Finding[];
  /** Demanda detectada sin página que la atienda. */
  oportunidades: Finding[];
  /** Las peores entidades, para saber por dónde empezar. */
  peores: ScoredEntity[];
  /** Cosas que la auditoría no pudo comprobar y por qué. */
  limitaciones: string[];
};

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function summarize(family: EntityFamily, scored: ScoredEntity[], sinSeo: number): FamilySummary {
  const total = scored.length;
  const suma = scored.reduce((a, s) => a + s.score, 0);
  return {
    family,
    total,
    conSeo: total - sinSeo,
    sinSeo,
    scorePromedio: total ? Math.round(suma / total) : 0,
    bien: scored.filter((s) => s.score >= 80).length,
    regular: scored.filter((s) => s.score >= 50 && s.score < 80).length,
    mal: scored.filter((s) => s.score < 50).length,
  };
}

/** Agrupa los campos que fallan de una familia en hallazgos con ejemplos. */
function foldIssues(
  family: EntityFamily,
  rows: { entity: ScoredEntity; score: SeoScore }[],
): Finding[] {
  const buckets = new Map<string, { titulo: string; arreglo: string; ejemplos: string[] }>();

  for (const { entity, score } of rows) {
    for (const issue of score.failing) {
      const key = `${family}:${issue.field}`;
      let b = buckets.get(key);
      if (!b) {
        b = { titulo: `${issue.label} — ${issue.message}`, arreglo: issue.fix, ejemplos: [] };
        buckets.set(key, b);
      }
      if (b.ejemplos.length < EXAMPLES) b.ejemplos.push(entity.name);
    }
  }

  return [...buckets.entries()]
    .map(([key, b]) => ({
      key,
      titulo: b.titulo,
      afectados: rows.filter((r) => r.score.failing.some((f) => `${family}:${f.field}` === key)).length,
      arreglo: b.arreglo,
      ejemplos: b.ejemplos,
    }))
    .sort((a, b) => b.afectados - a.afectados);
}

/** Detecta valores repetidos entre entidades: Google los trata como duplicados. */
function findDuplicates(
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

export async function runSeoAudit(supabase: SupabaseClient): Promise<SeoAuditReport> {
  const limitaciones: string[] = [];

  // ---------------------------------------------------------------- consultas
  const [
    productsRes,
    metaRes,
    altsRes,
    categoriesRes,
    landingsRes,
    blogRes,
    redirectsRes,
    zeroSearchRes,
  ] = await Promise.all([
    supabase.from("products")
      .select("id, name, slug, short_description, description, main_image, gallery_images, approval_status")
      .eq("is_active", true).limit(ROW_LIMIT),
    supabase.from("seo_meta").select("*").eq("entity_type", "product").limit(ROW_LIMIT),
    supabase.from("seo_image_alts").select("entity_id, alt_text").eq("entity_type", "product").limit(ROW_LIMIT * 4),
    supabase.from("categories")
      .select("id, name, slug, meta_title, meta_description, canonical_url, short_description, long_description, image_url, show_in_sitemap")
      .eq("is_active", true).limit(ROW_LIMIT),
    supabase.from("seo_landing_pages")
      .select("id, title, slug, kind, keyword, meta_title, meta_description, intro, body_html, hero_image, schema_jsonld, is_published")
      .limit(ROW_LIMIT),
    supabase.from("blog_posts")
      .select("id, title, slug, excerpt, cover_image, is_published").eq("is_published", true).limit(ROW_LIMIT),
    supabase.from("seo_redirects").select("from_path, to_path, active, status_code").limit(ROW_LIMIT),
    supabase.from("search_logs").select("query").eq("results_count", 0)
      .order("created_at", { ascending: false }).limit(500),
  ]);

  const products = (productsRes.data ?? []) as any[];
  const metas = (metaRes.data ?? []) as any[];
  const alts = (altsRes.data ?? []) as any[];
  const categories = (categoriesRes.data ?? []) as any[];
  const landings = (landingsRes.data ?? []) as any[];
  const blog = (blogRes.data ?? []) as any[];
  const redirects = (redirectsRes.data ?? []) as any[];
  const zeroSearches = (zeroSearchRes.data ?? []) as any[];

  for (const [name, res] of Object.entries({
    products: productsRes, seo_meta: metaRes, seo_image_alts: altsRes,
    categories: categoriesRes, seo_landing_pages: landingsRes, blog_posts: blogRes,
    seo_redirects: redirectsRes, search_logs: zeroSearchRes,
  })) {
    if ((res as any).error) {
      limitaciones.push(`No se pudo leer ${name}: ${(res as any).error.message}`);
    }
  }

  // ---------------------------------------------------------------- productos
  const metaByProduct = new Map<string, any>(metas.map((m) => [m.entity_id, m]));
  const altCount = new Map<string, number>();
  for (const a of alts) {
    if (!a.alt_text || !String(a.alt_text).trim()) continue;
    altCount.set(a.entity_id, (altCount.get(a.entity_id) ?? 0) + 1);
  }

  const productRows: { entity: ScoredEntity; score: SeoScore }[] = [];
  let productosSinSeo = 0;
  let noindexActivos = 0;
  const noindexEjemplos: string[] = [];

  for (const p of products) {
    const m = metaByProduct.get(p.id);
    if (!m) productosSinSeo++;
    if (m?.noindex) {
      noindexActivos++;
      if (noindexEjemplos.length < EXAMPLES) noindexEjemplos.push(p.name);
    }

    const gallery = Array.isArray(p.gallery_images) ? p.gallery_images.length : 0;
    const input: ProductSeoInput = {
      productName: p.name,
      seoTitle: m?.seo_title,
      seoDescription: m?.seo_description,
      slug: m?.slug ?? p.slug,
      canonical: m?.canonical,
      ogImage: m?.og_image ?? p.main_image,
      keywords: m?.keywords ?? [],
      tags: m?.tags ?? [],
      shoppingTitle: m?.shopping_title,
      shoppingDescription: m?.shopping_description,
      shortDescription: m?.short_description ?? p.short_description,
      longDescription: m?.long_description ?? p.description,
      imagesTotal: (p.main_image ? 1 : 0) + gallery,
      imagesWithAlt: altCount.get(p.id) ?? 0,
    };
    const score = scoreProduct(input);
    productRows.push({
      entity: {
        family: "producto", id: p.id, name: p.name, slug: m?.slug ?? p.slug,
        score: score.score, failing: score.failing.map((f) => f.label),
      },
      score,
    });
  }

  // -------------------------------------------------------------- categorías
  const categoryRows: { entity: ScoredEntity; score: SeoScore }[] = [];
  let categoriasSinSeo = 0;
  for (const c of categories) {
    if (!c.meta_title && !c.meta_description) categoriasSinSeo++;
    const input: CategorySeoInput = {
      name: c.name, metaTitle: c.meta_title, metaDescription: c.meta_description,
      slug: c.slug, canonicalUrl: c.canonical_url, shortDescription: c.short_description,
      longDescription: c.long_description, imageUrl: c.image_url, showInSitemap: c.show_in_sitemap,
    };
    const score = scoreCategory(input);
    categoryRows.push({
      entity: {
        family: "categoria", id: c.id, name: c.name, slug: c.slug,
        score: score.score, failing: score.failing.map((f) => f.label),
      },
      score,
    });
  }

  // ---------------------------------------------------------------- landings
  const landingRows: { entity: ScoredEntity; score: SeoScore }[] = [];
  let landingsSinSeo = 0;
  for (const l of landings) {
    if (!l.meta_title && !l.meta_description) landingsSinSeo++;
    const input: LandingSeoInput = {
      title: l.title, metaTitle: l.meta_title, metaDescription: l.meta_description,
      slug: l.slug, keyword: l.keyword, intro: l.intro, bodyHtml: l.body_html,
      heroImage: l.hero_image, schemaJsonld: l.schema_jsonld, isPublished: l.is_published,
    };
    const score = scoreLanding(input);
    landingRows.push({
      entity: {
        family: "landing", id: l.id, name: l.title ?? l.slug ?? l.id, slug: l.slug,
        score: score.score, failing: score.failing.map((f) => f.label),
      },
      score,
    });
  }

  // -------------------------------------------------------------------- blog
  // `blog_posts` no tiene campos de SEO propios, así que no se puede puntuar
  // con la misma vara. Lo que sí se puede es medir la higiene mínima.
  const blogSinExtracto = blog.filter((b) => !String(b.excerpt ?? "").trim());
  const blogSinPortada = blog.filter((b) => !String(b.cover_image ?? "").trim());

  // ------------------------------------------------------- técnico: duplicados
  const problemas_tecnicos: Finding[] = [];

  const tituloEntries = [
    ...productRows.map((r) => ({
      value: metaByProduct.get(r.entity.id)?.seo_title, who: `producto "${r.entity.name}"`,
    })),
    ...categories.map((c) => ({ value: c.meta_title, who: `categoría "${c.name}"` })),
    ...landings.map((l) => ({ value: l.meta_title, who: `landing "${l.title ?? l.slug}"` })),
  ];
  const dupTitulos = findDuplicates("títulos SEO", tituloEntries);
  if (dupTitulos) problemas_tecnicos.push(dupTitulos);

  const descEntries = [
    ...productRows.map((r) => ({
      value: metaByProduct.get(r.entity.id)?.seo_description, who: `producto "${r.entity.name}"`,
    })),
    ...categories.map((c) => ({ value: c.meta_description, who: `categoría "${c.name}"` })),
    ...landings.map((l) => ({ value: l.meta_description, who: `landing "${l.title ?? l.slug}"` })),
  ];
  const dupDescs = findDuplicates("meta descripciones", descEntries);
  if (dupDescs) problemas_tecnicos.push(dupDescs);

  const slugEntries = [
    ...products.map((p) => ({ value: p.slug, who: `producto "${p.name}"` })),
    ...categories.map((c) => ({ value: c.slug, who: `categoría "${c.name}"` })),
    ...landings.map((l) => ({ value: l.slug, who: `landing "${l.title ?? l.slug}"` })),
    ...blog.map((b) => ({ value: b.slug, who: `blog "${b.title}"` })),
  ];
  const dupSlugs = findDuplicates("slugs", slugEntries);
  if (dupSlugs) problemas_tecnicos.push(dupSlugs);

  // -------------------------------------------------- técnico: redirecciones
  const activeRedirects = redirects.filter((r) => r.active !== false);
  const fromSet = new Set(activeRedirects.map((r) => String(r.from_path)));
  const loops: string[] = [];
  const chains: string[] = [];
  for (const r of activeRedirects) {
    const from = String(r.from_path);
    const to = String(r.to_path);
    if (from === to) loops.push(`${from} apunta a sí misma`);
    else if (fromSet.has(to)) chains.push(`${from} → ${to} → ...`);
  }
  if (loops.length) {
    problemas_tecnicos.push({
      key: "redireccion:bucle",
      titulo: `${loops.length} redirección(es) que apuntan a sí mismas`,
      afectados: loops.length,
      arreglo: "Una redirección hacia sí misma deja la página inaccesible. Corrige el destino o desactívala.",
      ejemplos: loops.slice(0, EXAMPLES),
    });
  }
  if (chains.length) {
    problemas_tecnicos.push({
      key: "redireccion:cadena",
      titulo: `${chains.length} redirección(es) encadenadas`,
      afectados: chains.length,
      arreglo: "Encadenar redirecciones diluye la autoridad y ralentiza la carga. Apunta la primera directo al destino final.",
      ejemplos: chains.slice(0, EXAMPLES),
    });
  }

  // ---------------------------------------------------- técnico: indexación
  if (noindexActivos > 0) {
    problemas_tecnicos.push({
      key: "indexacion:noindex",
      titulo: `${noindexActivos} producto(s) activo(s) marcados para no aparecer en Google`,
      afectados: noindexActivos,
      arreglo: "Están a la venta pero ocultos a los buscadores. Si fue a propósito, ignóralo; si no, quita el noindex.",
      ejemplos: noindexEjemplos,
    });
  }

  const landingsSinPublicar = landings.filter((l) => !l.is_published);
  if (landingsSinPublicar.length) {
    problemas_tecnicos.push({
      key: "landing:sin_publicar",
      titulo: `${landingsSinPublicar.length} landing(s) creadas pero sin publicar`,
      afectados: landingsSinPublicar.length,
      arreglo: "Trabajo hecho que no está generando visitas. Publica las que estén listas y borra las abandonadas.",
      ejemplos: landingsSinPublicar.slice(0, EXAMPLES).map((l) => String(l.title ?? l.slug)),
    });
  }

  const sinAprobar = products.filter((p) => p.approval_status && p.approval_status !== "approved");
  if (sinAprobar.length) {
    problemas_tecnicos.push({
      key: "producto:sin_aprobar",
      titulo: `${sinAprobar.length} producto(s) activo(s) sin aprobar`,
      afectados: sinAprobar.length,
      arreglo: "Están activos pero su estado de aprobación no es 'approved'; revisa si deberían ser públicos.",
      ejemplos: sinAprobar.slice(0, EXAMPLES).map((p) => String(p.name)),
    });
  }

  if (blogSinExtracto.length) {
    problemas_tecnicos.push({
      key: "blog:sin_extracto",
      titulo: `${blogSinExtracto.length} artículo(s) del blog sin extracto`,
      afectados: blogSinExtracto.length,
      arreglo: "El extracto es lo que Google muestra bajo el título. Sin él, inventa un fragmento del texto.",
      ejemplos: blogSinExtracto.slice(0, EXAMPLES).map((b) => String(b.title)),
    });
  }
  if (blogSinPortada.length) {
    problemas_tecnicos.push({
      key: "blog:sin_portada",
      titulo: `${blogSinPortada.length} artículo(s) del blog sin imagen de portada`,
      afectados: blogSinPortada.length,
      arreglo: "Sin portada, al compartir el artículo en redes no aparece imagen y baja el clic.",
      ejemplos: blogSinPortada.slice(0, EXAMPLES).map((b) => String(b.title)),
    });
  }

  // ------------------------------------------------------------ oportunidades
  const oportunidades: Finding[] = [];
  const queryCount = new Map<string, number>();
  for (const s of zeroSearches) {
    const q = norm(s.query);
    if (!q || q.length < 3) continue;
    queryCount.set(q, (queryCount.get(q) ?? 0) + 1);
  }
  const topQueries = [...queryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, EXAMPLES);
  if (topQueries.length) {
    oportunidades.push({
      key: "busqueda:sin_resultados",
      titulo: `${queryCount.size} búsqueda(s) distintas en tu web no devolvieron nada`,
      afectados: zeroSearches.length,
      arreglo:
        "Es demanda que ya tienes y no estás atendiendo. Cada una es un producto que falta, un sinónimo por mapear o una landing por crear.",
      ejemplos: topQueries.map(([q, n]) => `"${q}" (${n} ${n === 1 ? "vez" : "veces"})`),
    });
  }

  // ---------------------------------------------------------------- limitaciones
  limitaciones.push(
    "El blog no tiene campos de SEO propios (meta título ni meta descripción): solo se revisó extracto, portada y slug.",
  );
  limitaciones.push(
    "La auditoría lee la base de datos, no rastrea el sitio publicado: no comprueba velocidad de carga, enlaces rotos externos ni qué tiene Google indexado de verdad.",
  );
  if (products.length >= ROW_LIMIT) {
    limitaciones.push(`Se revisaron los primeros ${ROW_LIMIT} productos; hay más.`);
  }

  // ------------------------------------------------------------------ armado
  const todos = [...productRows, ...categoryRows, ...landingRows];
  const peores = todos
    .map((r) => r.entity)
    .sort((a, b) => a.score - b.score)
    .slice(0, 15);

  return {
    generado_en: new Date().toISOString(),
    resumen: [
      summarize("producto", productRows.map((r) => r.entity), productosSinSeo),
      summarize("categoria", categoryRows.map((r) => r.entity), categoriasSinSeo),
      summarize("landing", landingRows.map((r) => r.entity), landingsSinSeo),
      {
        family: "blog", total: blog.length, conSeo: blog.length - blogSinExtracto.length,
        sinSeo: blogSinExtracto.length, scorePromedio: 0, bien: 0, regular: 0, mal: 0,
      },
    ],
    problemas_de_contenido: [
      ...foldIssues("producto", productRows),
      ...foldIssues("categoria", categoryRows),
      ...foldIssues("landing", landingRows),
    ].sort((a, b) => b.afectados - a.afectados).slice(0, 20),
    problemas_tecnicos,
    oportunidades,
    peores,
    limitaciones,
  };
}
