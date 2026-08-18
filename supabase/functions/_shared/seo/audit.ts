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
  analyzeRedirects,
  analyzeTaxonomy,
  type Cobertura,
  contarCobertura,
  type EntityFamily,
  EXAMPLES,
  type Finding,
  findDuplicates,
  foldIssues,
  norm,
  type ScoredEntity,
  sinCobertura,
  tieneTexto,
} from "./checks.ts";
import {
  type CategorySeoInput,
  type LandingSeoInput,
  type ProductSeoInput,
  scoreCategory,
  scoreLanding,
  scoreProduct,
  type SeoScore,
} from "./rubric.ts";

export type { EntityFamily, Finding, ScoredEntity };

/** Tope de filas por consulta, para no traer el catálogo entero sin querer. */
const ROW_LIMIT = 2000;

/** Cuántas búsquedas sin resultados se leen. Si se llena, el informe lo dice. */
const ZERO_SEARCH_LIMIT = 500;

/**
 * Ventana de las búsquedas sin resultados.
 *
 * Sin límite de fecha el informe mezcla fallos ya resueltos con demanda real:
 * una búsqueda que falló hace meses porque el buscador estaba roto sigue
 * apareciendo como "oportunidad" mucho después de arreglarlo, e invita a crear
 * páginas para una demanda que ya está atendida.
 */
const ZERO_SEARCH_DAYS = 90;

export type FamilySummary = {
  family: EntityFamily;
  total: number;
  /**
   * Cuántas páginas tienen SEO cargado, según `criterio`. `null` cuando la
   * familia no tiene campos de SEO propios y el número no significaría nada.
   */
  conSeo: number | null;
  sinSeo: number | null;
  /** Qué se midió para llegar a esos dos números. */
  criterio: string;
  scorePromedio: number;
  bien: number;      // >= 80
  regular: number;   // 50-79
  mal: number;       // < 50
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

function summarize(
  family: EntityFamily,
  scored: ScoredEntity[],
  cobertura: Cobertura,
): FamilySummary {
  const total = scored.length;
  const suma = scored.reduce((a, s) => a + s.score, 0);
  return {
    family,
    total,
    conSeo: cobertura.conSeo,
    sinSeo: cobertura.sinSeo,
    criterio: cobertura.criterio,
    scorePromedio: total ? Math.round(suma / total) : 0,
    bien: scored.filter((s) => s.score >= 80).length,
    regular: scored.filter((s) => s.score >= 50 && s.score < 80).length,
    mal: scored.filter((s) => s.score < 50).length,
  };
}

export type AuditOptions = {
  /**
   * Guarda el puntaje calculado en `seo_meta.score` y `last_analyzed_at`.
   *
   * Solo actualiza filas que ya existen: nunca crea una fila de SEO para un
   * producto que no la tiene, porque eso haría que el producto pareciera
   * tener SEO cuando no lo tiene, y rompería los recuentos de cobertura del
   * panel.
   */
  persistScores?: boolean;
};

export async function runSeoAudit(
  supabase: SupabaseClient,
  options: AuditOptions = {},
): Promise<SeoAuditReport> {
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
      .select(
        "id, name, slug, short_description, description, main_image, gallery_images, approval_status, category, subcategory",
      )
      .eq("is_active", true).limit(ROW_LIMIT),
    supabase.from("seo_meta").select("*").eq("entity_type", "product").limit(ROW_LIMIT),
    supabase.from("seo_image_alts").select("entity_id, alt_text").eq("entity_type", "product").limit(ROW_LIMIT * 4),
    supabase.from("categories")
      .select("id, name, slug, parent_id, type, related_product_ids, meta_title, meta_description, canonical_url, short_description, long_description, image_url, show_in_sitemap")
      .eq("is_active", true).limit(ROW_LIMIT),
    supabase.from("seo_landing_pages")
      .select("id, title, slug, kind, keyword, meta_title, meta_description, intro, body_html, hero_image, schema_jsonld, is_published")
      .limit(ROW_LIMIT),
    supabase.from("blog_posts")
      .select("id, title, slug, excerpt, cover_image, is_published").eq("is_published", true).limit(ROW_LIMIT),
    supabase.from("seo_redirects").select("from_path, to_path, active, status_code").limit(ROW_LIMIT),
    supabase.from("search_logs").select("query, created_at").eq("results_count", 0)
      .gte(
        "created_at",
        new Date(Date.now() - ZERO_SEARCH_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false }).limit(ZERO_SEARCH_LIMIT),
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
  // Para la cobertura se miran los campos, no si existe la fila en `seo_meta`:
  // una fila creada y vacía no es un producto con SEO.
  const metaProductos: { metaTitle?: string | null; metaDescription?: string | null }[] = [];
  let noindexActivos = 0;
  const noindexEjemplos: string[] = [];

  for (const p of products) {
    const m = metaByProduct.get(p.id);
    metaProductos.push({ metaTitle: m?.seo_title, metaDescription: m?.seo_description });
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
  for (const c of categories) {
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
  for (const l of landings) {
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
  const { loops, chains } = analyzeRedirects(redirects);
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

  // Se separan los dos casos: rechazado/pendiente es una decisión tomada, y
  // vacío es que nadie decidió. Antes el `p.approval_status &&` dejaba fuera
  // los vacíos, justo los que nadie está mirando.
  const sinAprobar = products.filter(
    (p) => tieneTexto(p.approval_status) && p.approval_status !== "approved",
  );
  if (sinAprobar.length) {
    problemas_tecnicos.push({
      key: "producto:sin_aprobar",
      titulo: `${sinAprobar.length} producto(s) activo(s) sin aprobar`,
      afectados: sinAprobar.length,
      arreglo: "Están activos pero su estado de aprobación no es 'approved'; revisa si deberían ser públicos.",
      ejemplos: sinAprobar.slice(0, EXAMPLES).map((p) => String(p.name)),
    });
  }

  // ------------------------------------------------- técnico: taxonomía
  // `products.category` es texto libre, así que la relación puede estar rota
  // sin que nada lo avise: categorías activas donde no cae ningún producto, y
  // productos apuntando a categorías que no existen.
  const taxonomia = analyzeTaxonomy(categories as any[], products as any[]);

  if (taxonomia.vacias.length) {
    problemas_tecnicos.push({
      key: "categoria:sin_productos",
      titulo: `${taxonomia.vacias.length} categoría(s) activas sin ningún producto`,
      afectados: taxonomia.vacias.length,
      arreglo:
        "Son páginas indexables vacías: Google las lee como contenido pobre y arrastran al resto del sitio. " +
        "Desactiva las que sobren y deja solo las que agrupen productos de verdad. Escribirles SEO antes de decidir eso es trabajo perdido.",
      ejemplos: taxonomia.vacias.slice(0, EXAMPLES).map((c) => `${c.name} (/${c.slug ?? "?"})`),
    });
  }

  if (taxonomia.huerfanos.length) {
    problemas_tecnicos.push({
      key: "producto:categoria_inexistente",
      titulo: `${taxonomia.huerfanos.length} categoría(s) escritas en productos que no existen en el catálogo`,
      afectados: taxonomia.huerfanos.reduce((a, h) => a + h.productos, 0),
      arreglo:
        "El campo de categoría del producto es texto libre y no coincide con ninguna categoría real, así que esos productos no aparecen donde deberían. " +
        "Corrige el texto o crea la categoría que falta.",
      ejemplos: taxonomia.huerfanos.slice(0, EXAMPLES).map((h) =>
        `"${h.valor}" (${h.productos} producto${h.productos === 1 ? "" : "s"})`
      ),
    });
  }

  if (taxonomia.sinCategoria) {
    problemas_tecnicos.push({
      key: "producto:sin_categoria",
      titulo: `${taxonomia.sinCategoria} producto(s) activo(s) sin categoría`,
      afectados: taxonomia.sinCategoria,
      arreglo:
        "No se llega a ellos navegando: solo por búsqueda o enlace directo. Asígnales una categoría.",
      ejemplos: products.filter((p) => !tieneTexto(p.category)).slice(0, EXAMPLES).map((p) =>
        String(p.name)
      ),
    });
  }

  const sinEstado = products.filter((p) => !tieneTexto(p.approval_status));
  if (sinEstado.length) {
    problemas_tecnicos.push({
      key: "producto:estado_sin_definir",
      titulo: `${sinEstado.length} producto(s) activo(s) sin estado de aprobación definido`,
      afectados: sinEstado.length,
      arreglo: sinEstado.length === products.length
        ? "Ningún producto tiene estado de aprobación: la columna no se está usando. Si no la necesitas, ignóralo; si sí, defínela antes de fiarte de este control."
        : "Están a la venta sin que nadie los haya revisado. Márcalos como aprobados o desactívalos.",
      ejemplos: sinEstado.slice(0, EXAMPLES).map((p) => String(p.name)),
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
    // `afectados` cuenta lo mismo que el título —búsquedas distintas—. Antes
    // traía el total de eventos, así que el hallazgo mostraba dos magnitudes
    // distintas y quien lo leía las tomaba por la misma.
    oportunidades.push({
      key: "busqueda:sin_resultados",
      titulo:
        `${queryCount.size} búsqueda(s) distintas no devolvieron nada en los últimos ${ZERO_SEARCH_DAYS} días`,
      afectados: queryCount.size,
      arreglo:
        `Es demanda que ya tienes y no estás atendiendo (${zeroSearches.length} búsquedas en total). ` +
        "Cada una es un producto que falta, un sinónimo por mapear o una landing por crear. " +
        "Antes de crear nada, comprueba que la búsqueda las siga fallando hoy: si el buscador se arregló, estas ya están atendidas.",
      ejemplos: topQueries.map(([q, n]) => `"${q}" (${n} ${n === 1 ? "vez" : "veces"})`),
    });
  }

  // ------------------------------------------------- persistir los puntajes
  // La columna `seo_meta.score` existía sin que nadie la escribiera: el panel
  // calculaba el puntaje en el navegador y lo descartaba, así que su export
  // CSV leía siempre 0 y marcaba "score bajo" en todo el catálogo.
  if (options.persistScores) {
    const filas = productRows
      .map((r) => {
        const m = metaByProduct.get(r.entity.id);
        return m
          ? {
            entity_type: "product",
            entity_id: r.entity.id,
            score: r.entity.score,
            last_analyzed_at: new Date().toISOString(),
          }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (filas.length) {
      const { error } = await supabase.from("seo_meta")
        .upsert(filas, { onConflict: "entity_type,entity_id" });
      if (error) limitaciones.push(`No se pudieron guardar los puntajes: ${error.message}`);
      else limitaciones.push(`Se guardó el puntaje de ${filas.length} producto(s).`);
    }
  }

  // ---------------------------------------------------------------- limitaciones
  limitaciones.push(
    "El blog no tiene campos de SEO propios (meta título ni meta descripción): solo se revisó extracto, portada y slug.",
  );
  limitaciones.push(
    "La auditoría lee la base de datos, no rastrea el sitio publicado: no comprueba velocidad de carga, enlaces rotos externos ni qué tiene Google indexado de verdad.",
  );
  limitaciones.push(
    "Solo se revisan productos y categorías activos y artículos publicados: lo inactivo no entra en los totales.",
  );
  if (products.length >= ROW_LIMIT) {
    limitaciones.push(`Se revisaron los primeros ${ROW_LIMIT} productos; hay más.`);
  }
  limitaciones.push(
    `Las búsquedas sin resultados son solo las de los últimos ${ZERO_SEARCH_DAYS} días: las anteriores suelen ser fallos ya corregidos, no demanda pendiente.`,
  );
  if (zeroSearches.length >= ZERO_SEARCH_LIMIT) {
    limitaciones.push(
      `Dentro de esa ventana se leyeron las últimas ${ZERO_SEARCH_LIMIT}; hay más, así que ese recuento es un mínimo.`,
    );
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
      summarize("producto", productRows.map((r) => r.entity), contarCobertura(metaProductos)),
      summarize(
        "categoria",
        categoryRows.map((r) => r.entity),
        contarCobertura(categories.map((c) => ({
          metaTitle: c.meta_title,
          metaDescription: c.meta_description,
        }))),
      ),
      summarize(
        "landing",
        landingRows.map((r) => r.entity),
        contarCobertura(landings.map((l) => ({
          metaTitle: l.meta_title,
          metaDescription: l.meta_description,
        }))),
      ),
      {
        family: "blog",
        total: blog.length,
        // El blog no tiene meta título ni meta descripción, así que no hay
        // cobertura que medir. Antes se rellenaba con "tiene extracto", y el
        // informe lo leía como "el 83% del blog tiene SEO".
        ...sinCobertura(
          "no aplica: los artículos no tienen campos de SEO propios; lo que falte sale en los problemas técnicos",
        ),
        scorePromedio: 0, bien: 0, regular: 0, mal: 0,
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
