// Rúbricas de SEO por tipo de entidad, sin dependencias de red ni de Supabase.
//
// La rúbrica de producto es un espejo fiel de `computeProductSeoScore` en
// `src/lib/seoScore.ts`: mismos pesos, mismos umbrales, mismos mensajes. Se
// duplica porque el panel corre en el navegador y esto corre en Deno, y acoplar
// el build de Vite al directorio de edge functions es peor negocio que estas
// ~100 líneas. Si cambias un umbral, cámbialo en los dos sitios.
//
// Categorías y landings no tenían rúbrica en ninguna parte: se definen aquí.

export type SeoIssue = {
  field: string;
  label: string;
  weight: number;
  ok: boolean;
  /** Qué está mal, en lenguaje de negocio. */
  message: string;
  /** Cómo se arregla. */
  fix: string;
};

export type SeoScore = {
  score: number;
  issues: SeoIssue[];
  /** Solo los campos que fallan. */
  failing: SeoIssue[];
};

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function finish(issues: SeoIssue[]): SeoScore {
  const score = issues.reduce((acc, i) => acc + (i.ok ? i.weight : 0), 0);
  return {
    score: Math.min(100, Math.max(0, score)),
    issues,
    failing: issues.filter((i) => !i.ok),
  };
}

// --------------------------------------------------------------------------
// Producto — espejo de src/lib/seoScore.ts
// --------------------------------------------------------------------------

export type ProductSeoInput = {
  productName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  canonical?: string | null;
  ogImage?: string | null;
  keywords?: string[] | null;
  tags?: string[] | null;
  shoppingTitle?: string | null;
  shoppingDescription?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  imagesTotal?: number;
  imagesWithAlt?: number;
};

export function scoreProduct(input: ProductSeoInput): SeoScore {
  const out: SeoIssue[] = [];
  const push = (
    field: string, label: string, weight: number,
    ok: boolean, message: string, fix: string,
  ) => out.push({ field, label, weight, ok, message, fix });

  const title = (input.seoTitle ?? "").trim();
  const name = (input.productName ?? "").trim();
  const firstWord = norm(name).split(" ")[0] ?? "";
  const titleOk = !!title && title.length >= 45 && title.length <= 60 &&
    (!name || norm(title).includes(firstWord));
  push("seo_title", "Título SEO", 12, titleOk,
    !title
      ? "Falta el título SEO"
      : title.length < 45
      ? `Título muy corto (${title.length}, ideal 45-60)`
      : title.length > 60
      ? `Título muy largo (${title.length}, máx 60)`
      : !norm(title).includes(firstWord)
      ? "El título no incluye el nombre del producto"
      : "OK",
    "Escribe un título de 45-60 caracteres incluyendo el nombre del producto.");

  const desc = (input.seoDescription ?? "").trim();
  push("seo_description", "Meta descripción", 12,
    !!desc && desc.length >= 130 && desc.length <= 160,
    !desc
      ? "Falta la meta descripción"
      : desc.length < 130
      ? `Descripción corta (${desc.length}, ideal 130-160)`
      : desc.length > 160
      ? `Descripción larga (${desc.length}, máx 160)`
      : "OK",
    "Redacta una meta descripción clara y comercial de 130-160 caracteres.");

  const slug = (input.slug ?? "").trim();
  push("slug", "Slug", 8,
    !!slug && /^[a-z0-9-]+$/.test(slug) && slug.length <= 75,
    !slug
      ? "Falta el slug"
      : !/^[a-z0-9-]+$/.test(slug)
      ? "El slug tiene tildes o caracteres especiales"
      : slug.length > 75
      ? "Slug demasiado largo"
      : "OK",
    "Usa minúsculas, sin tildes, separa con guiones y máx 75 caracteres.");

  const canonical = (input.canonical ?? "").trim();
  const canonOk = !!canonical && (canonical.startsWith("/") || /^https?:\/\//.test(canonical));
  push("canonical", "Canonical URL", 7, canonOk,
    !canonical ? "Falta la URL canónica" : !canonOk ? "Canonical inválida" : "OK",
    "Apunta a la URL real del producto, p.ej. /producto/<slug>.");

  const og = (input.ogImage ?? "").trim();
  push("og_image", "Imagen OG", 7, !!og,
    og ? "OK" : "Falta imagen para compartir (OG)",
    "Usa la imagen principal optimizada del producto.");

  const kws = (input.keywords ?? []).filter((x) => !!x && x.trim());
  push("keywords", "Palabras clave", 8, kws.length >= 5 && kws.length <= 8,
    kws.length === 0
      ? "Faltan palabras clave"
      : kws.length < 3
      ? `Solo ${kws.length} palabra(s) clave (mín 3)`
      : kws.length < 5
      ? `Ideal 5-8 palabras clave (tienes ${kws.length})`
      : kws.length > 8
      ? `Demasiadas (${kws.length}); ideal 5-8`
      : "OK",
    "Agrega entre 5 y 8 palabras clave relevantes.");

  const tgs = (input.tags ?? []).filter((x) => !!x && x.trim());
  push("tags", "Tags", 8, tgs.length >= 3,
    tgs.length === 0 ? "Faltan tags" : tgs.length < 3 ? `Solo ${tgs.length} tag(s) (mín 3)` : "OK",
    "Agrega al menos 3 tags (categoría, ingrediente, objetivo, beneficio).");

  const sht = (input.shoppingTitle ?? "").trim();
  push("shopping_title", "Título Google Shopping", 8, !!sht && sht.length <= 150,
    !sht
      ? "Falta título de Google Shopping"
      : sht.length > 150
      ? `Demasiado largo (${sht.length}, máx 150)`
      : "OK",
    "Incluye producto, marca y presentación; máx 150 caracteres.");

  const shd = (input.shoppingDescription ?? "").trim();
  push("shopping_description", "Descripción Google Shopping", 8, !!shd,
    shd ? "OK" : "Falta descripción de Google Shopping",
    "Redacta una descripción clara y comercial, sin claims médicos.");

  const sd = (input.shortDescription ?? "").trim();
  push("short_description", "Descripción corta", 7, !!sd && sd.length < 100,
    !sd ? "Falta descripción corta" : sd.length >= 100 ? `Muy larga (${sd.length}, máx 99)` : "OK",
    "Resume el producto en menos de 100 caracteres.");

  const ld = (input.longDescription ?? "").trim();
  push("long_description", "Descripción larga", 8, !!ld && ld.length >= 120,
    !ld ? "Falta descripción larga" : ld.length < 120 ? `Muy corta (${ld.length}, mín 120)` : "OK",
    "Explica el producto, beneficio general y forma de uso (≥120 chars).");

  const total = input.imagesTotal ?? 0;
  const withAlt = input.imagesWithAlt ?? 0;
  push("image_alts", "Alt text de imágenes", 7, total === 0 ? true : withAlt >= total,
    total === 0
      ? "Sin imágenes"
      : withAlt < total
      ? `${total - withAlt} imagen(es) sin alt`
      : "OK",
    "Describe producto, marca, presentación e ingrediente en cada alt.");

  return finish(out);
}

// --------------------------------------------------------------------------
// Categoría
// --------------------------------------------------------------------------

export type CategorySeoInput = {
  name?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  canonicalUrl?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  imageUrl?: string | null;
  showInSitemap?: boolean | null;
};

export function scoreCategory(input: CategorySeoInput): SeoScore {
  const out: SeoIssue[] = [];
  const push = (
    field: string, label: string, weight: number,
    ok: boolean, message: string, fix: string,
  ) => out.push({ field, label, weight, ok, message, fix });

  const title = (input.metaTitle ?? "").trim();
  push("meta_title", "Meta título", 25,
    !!title && title.length >= 30 && title.length <= 60,
    !title
      ? "Falta el meta título"
      : title.length < 30
      ? `Muy corto (${title.length}, ideal 30-60)`
      : `Muy largo (${title.length}, máx 60)`,
    "Escribe un meta título de 30-60 caracteres con el nombre de la categoría.");

  const desc = (input.metaDescription ?? "").trim();
  push("meta_description", "Meta descripción", 25,
    !!desc && desc.length >= 120 && desc.length <= 160,
    !desc
      ? "Falta la meta descripción"
      : desc.length < 120
      ? `Corta (${desc.length}, ideal 120-160)`
      : `Larga (${desc.length}, máx 160)`,
    "Describe qué encuentra el visitante en esta categoría, en 120-160 caracteres.");

  const slug = (input.slug ?? "").trim();
  push("slug", "Slug", 10,
    !!slug && /^[a-z0-9-]+$/.test(slug),
    !slug ? "Falta el slug" : "El slug tiene tildes o caracteres especiales",
    "Usa minúsculas, sin tildes y separadas con guiones.");

  const canonical = (input.canonicalUrl ?? "").trim();
  push("canonical_url", "Canonical URL", 10,
    !!canonical && (canonical.startsWith("/") || /^https?:\/\//.test(canonical)),
    !canonical ? "Falta la URL canónica" : "Canonical inválida",
    "Apunta a la URL real de la categoría.");

  const long = (input.longDescription ?? "").trim();
  push("long_description", "Texto de categoría", 20, long.length >= 200,
    !long
      ? "La categoría no tiene texto propio"
      : `Texto muy corto (${long.length}, mín 200)`,
    "Escribe al menos 200 caracteres explicando la categoría: sin texto propio, Google la ve como una lista de productos sin valor.");

  push("image_url", "Imagen", 10, !!(input.imageUrl ?? "").trim(),
    "La categoría no tiene imagen",
    "Sube una imagen representativa: se usa al compartir en redes.");

  return finish(out);
}

// --------------------------------------------------------------------------
// Landing SEO
// --------------------------------------------------------------------------

export type LandingSeoInput = {
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  keyword?: string | null;
  intro?: string | null;
  bodyHtml?: string | null;
  heroImage?: string | null;
  schemaJsonld?: unknown;
  isPublished?: boolean | null;
};

export function scoreLanding(input: LandingSeoInput): SeoScore {
  const out: SeoIssue[] = [];
  const push = (
    field: string, label: string, weight: number,
    ok: boolean, message: string, fix: string,
  ) => out.push({ field, label, weight, ok, message, fix });

  const title = (input.metaTitle ?? "").trim();
  push("meta_title", "Meta título", 20,
    !!title && title.length >= 30 && title.length <= 60,
    !title
      ? "Falta el meta título"
      : title.length < 30
      ? `Muy corto (${title.length}, ideal 30-60)`
      : `Muy largo (${title.length}, máx 60)`,
    "Escribe un meta título de 30-60 caracteres que incluya la palabra clave.");

  const desc = (input.metaDescription ?? "").trim();
  push("meta_description", "Meta descripción", 20,
    !!desc && desc.length >= 120 && desc.length <= 160,
    !desc
      ? "Falta la meta descripción"
      : desc.length < 120
      ? `Corta (${desc.length}, ideal 120-160)`
      : `Larga (${desc.length}, máx 160)`,
    "Redacta 120-160 caracteres que respondan a la intención de búsqueda.");

  const slug = (input.slug ?? "").trim();
  push("slug", "Slug", 10, !!slug && /^[a-z0-9-]+$/.test(slug),
    !slug ? "Falta el slug" : "El slug tiene tildes o caracteres especiales",
    "Usa minúsculas, sin tildes y separadas con guiones.");

  const kw = (input.keyword ?? "").trim();
  push("keyword", "Palabra clave objetivo", 10, !!kw,
    "La landing no declara a qué búsqueda apunta",
    "Define la palabra clave objetivo: sin ella no se puede medir si funciona.");

  const body = (input.bodyHtml ?? "").replace(/<[^>]*>/g, " ").trim();
  push("body_html", "Contenido", 20, body.length >= 800,
    !body
      ? "La landing no tiene contenido"
      : `Contenido muy corto (${body.length} caracteres de texto, mín 800)`,
    "Una landing con poco texto no compite. Apunta a 800+ caracteres útiles.");

  push("hero_image", "Imagen principal", 10, !!(input.heroImage ?? "").trim(),
    "Falta la imagen principal",
    "Agrega una imagen de cabecera.");

  push("is_published", "Publicada", 10, input.isPublished === true,
    "La landing está sin publicar: no la ve nadie",
    "Publícala si ya está lista, o bórrala si quedó a medias.");

  return finish(out);
}
