// Corre después de `vite build` (hook postbuild).
//
// POR QUÉ EXISTE
// La tienda es una aplicación que se dibuja en el navegador: el servidor manda
// siempre el mismo `dist/index.html` de 2,5 KB con un `<div id="root">` vacío y
// el contenido lo pone JavaScript. Googlebot ejecuta JavaScript y lo ve, pero
// los rastreadores de las IA (GPTBot, ClaudeBot, PerplexityBot) y los que
// generan las tarjetas de WhatsApp, Facebook o X no lo ejecutan: piden el HTML,
// leen lo que viene y se van. Para ellos el sitio entero era una sola página
// genérica, y las 76 URLs del sitemap declaraban la portada como su canónica.
//
// QUÉ HACE
// Recorre las mismas tablas que el generador de sitemaps y escribe un HTML
// estático por ruta —`dist/producto/<slug>/index.html`— con el título, la meta,
// la canónica, las etiquetas para compartir, el schema.org y el texto ya
// dentro. El mismo bundle de JavaScript sigue estando en la página, así que al
// abrirla en un navegador la aplicación arranca igual y reemplaza el contenido
// estático. Nadie ve algo distinto según quién sea: es la misma página, una
// versión sin JavaScript y otra con él.
//
// SI FALLA
// El hook lleva `|| true`: un fallo aquí no rompe el despliegue, solo deja el
// sitio como estaba. El resumen final dice cuántas páginas se escribieron.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { landingPath } from "./routes.mjs";

const BASE_URL = "https://nutribatidos.com";
const SITE_NAME = "Nutribatidos";
const DIST = resolve("dist");
const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ab92b0f7-8a4a-4391-9bed-0931f1af1340/id-preview-91df73ee--ace85f94-64f0-4daa-a974-2aa900bc3a79.lovable.app-1778858363091.png";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mphrhcuqzkbbnovmdbpc.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHJoY3VxemtiYm5vdm1kYnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTM1ODMsImV4cCI6MjA5MzYyOTU4M30.2ID3yuUo0K5oBRg7uX6-VkeZzC_74VEgm5WlcOWynsg";

// ---------------------------------------------------------------- utilidades

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Texto plano a partir de HTML, para metas y descripciones. */
const plano = (html) =>
  String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/**
 * Deja pasar solo el HTML de contenido. El cuerpo de las landings y del blog
 * lo escribe el panel, pero aquí se hornea en un archivo estático: si alguna
 * vez entrara un `<script>` por esa vía, quedaría servido desde el dominio.
 */
const ETIQUETAS_OK = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
  "h2", "h3", "h4", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td",
]);

function htmlSeguro(raw) {
  return String(raw ?? "")
    // Fuera bloques enteros que nunca son contenido.
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, (tag) => {
      const m = /^<\s*(\/?)\s*([a-zA-Z0-9]+)/.exec(tag);
      if (!m) return "";
      const [, cierre, nombre] = m;
      const etiqueta = nombre.toLowerCase();
      if (!ETIQUETAS_OK.has(etiqueta)) return "";
      if (cierre) return `</${etiqueta}>`;
      // Del `<a>` solo sobrevive un href http(s) o relativo; el resto de
      // atributos (incluidos los `on*`) se descarta.
      if (etiqueta === "a") {
        const href = /href\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
        return /^(https?:\/\/|\/)/i.test(href) ? `<a href="${esc(href)}">` : "<a>";
      }
      return `<${etiqueta}>`;
    })
    .trim();
}

const absoluta = (u) => {
  const v = String(u ?? "").trim();
  if (!v) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

/** Mismos recortes que aplica el componente SEO en la aplicación. */
const recortarTitulo = (t) => (t.length > 60 ? `${t.slice(0, 57)}…` : t);
const recortarDesc = (d) => (d.length > 160 ? `${d.slice(0, 157)}…` : d);

const soles = (n) => `S/ ${Number(n ?? 0).toFixed(2)}`;

const lista = (v) => (Array.isArray(v) ? v : []);

/** Normaliza las FAQ, que en la base vienen como {q,a} o {question,answer}. */
const faqsDe = (v) =>
  lista(v)
    .map((f) => ({ q: String(f?.q ?? f?.question ?? ""), a: String(f?.a ?? f?.answer ?? "") }))
    .filter((f) => f.q && f.a);

// ------------------------------------------------------------------ plantilla

/**
 * Estilos mínimos del contenido estático. La aplicación lo reemplaza al
 * arrancar, así que esto solo se ve durante ese instante y en un navegador sin
 * JavaScript. No oculta nada: es el mismo texto que verá cualquiera.
 */
const ESTILO_PRERENDER = `
<style id="prerender-style">
  [data-prerender]{max-width:52rem;margin:0 auto;padding:2rem 1.25rem;
    font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65;color:#1c1917}
  [data-prerender] h1{font-size:1.9rem;line-height:1.2;margin:0 0 .75rem}
  [data-prerender] h2{font-size:1.3rem;margin:2rem 0 .5rem}
  [data-prerender] h3{font-size:1.1rem;margin:1.5rem 0 .5rem}
  [data-prerender] img{max-width:100%;height:auto;border-radius:.5rem}
  [data-prerender] a{color:#166534}
  [data-prerender] ul{padding-left:1.25rem}
  [data-prerender] .precio{font-size:1.5rem;font-weight:600;color:#166534}
  [data-prerender] .antes{text-decoration:line-through;color:#78716c;font-weight:400;font-size:1rem;margin-left:.5rem}
  [data-prerender] nav{font-size:.8rem;color:#78716c;margin-bottom:1rem}
  [data-prerender] table{border-collapse:collapse;width:100%}
  [data-prerender] th,[data-prerender] td{border:1px solid #e7e5e4;padding:.4rem .6rem;text-align:left}
</style>`;

function construirPagina(plantilla, p) {
  const url = `${BASE_URL}${p.canonical ?? p.path}`;
  const titulo = recortarTitulo(p.title);
  const desc = p.description ? recortarDesc(plano(p.description)) : "";
  const imagen = absoluta(p.image);

  const cabeza = [
    `<title>${esc(titulo)}</title>`,
    desc ? `<meta name="description" content="${esc(desc)}" />` : "",
    p.noindex ? `<meta name="robots" content="noindex,follow" />` : "",
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    desc ? `<meta property="og:description" content="${esc(desc)}" />` : "",
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="${esc(p.ogType ?? "website")}" />`,
    `<meta property="og:image" content="${esc(imagen)}" />`,
    p.publishedTime ? `<meta property="article:published_time" content="${esc(p.publishedTime)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(titulo)}" />`,
    desc ? `<meta name="twitter:description" content="${esc(desc)}" />` : "",
    `<meta name="twitter:image" content="${esc(imagen)}" />`,
    ...(p.jsonLd ?? []).map(
      (b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, "\\u003c")}</script>`,
    ),
  ].filter(Boolean).join("\n    ");

  return plantilla
    // Fuera las etiquetas de la plantilla: cada página emite las suyas. Si se
    // dejaran, la página quedaría con dos títulos y dos canónicas.
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace("</head>", `  ${cabeza}\n${ESTILO_PRERENDER}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><div data-prerender>${p.body}</div></div>`);
}

/**
 * Devuelve la plantilla a su estado virgen.
 *
 * La portada se escribe sobre `dist/index.html`, que es a la vez la plantilla.
 * Si el build corre otra vez sin vaciar `dist` (Vite lo vacía, pero no hay que
 * depender de ello), la plantilla leída sería una página ya prerenderizada y el
 * contenido se anidaría sobre sí mismo.
 */
function plantillaLimpia(html) {
  return html
    .replace(/<style id="prerender-style">[\s\S]*?<\/style>/i, "")
    // `#root` es lo único que hay en el body, así que el último `</div>`
    // cierra justo lo que se inyectó.
    .replace(/<div id="root">[\s\S]*<\/div>/i, '<div id="root"></div>');
}

function escribir(p, plantilla) {
  const destino = p.path === "/" ? resolve(DIST, "index.html") : resolve(DIST, `.${p.path}`, "index.html");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, construirPagina(plantilla, p), "utf8");
}

const migaDePan = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem", position: i + 1, name: it.name, item: `${BASE_URL}${it.path}`,
  })),
});

const faqJsonLd = (faqs) =>
  faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

const bloqueFaqs = (faqs) =>
  faqs.length
    ? `<h2>Preguntas frecuentes</h2>${faqs
        .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
        .join("")}`
    : "";

const enlaces = (items) =>
  items.length
    ? `<ul>${items
        .map((i) => `<li><a href="${esc(i.path)}">${esc(i.nombre)}</a>${i.extra ? ` — ${esc(i.extra)}` : ""}</li>`)
        .join("")}</ul>`
    : "";

const precioVigente = (p) =>
  Number(p.sale_price ?? 0) > 0 && Number(p.sale_price) < Number(p.price) ? p.sale_price : p.price;

// -------------------------------------------------------------------- páginas

function paginaProducto(p, meta) {
  const hayOferta = Number(p.sale_price ?? 0) > 0 && Number(p.sale_price) < Number(p.price);
  const precio = Number(precioVigente(p) ?? 0);
  const faqs = faqsDe(p.faqs);
  const galeria = [p.main_image, ...lista(p.gallery_images)].filter(Boolean).map(absoluta);
  const resumen = p.short_description || plano(p.description) || p.name;
  const path = `/producto/${p.slug}`;

  const nutricion = (() => {
    const n = p.nutrition_facts;
    if (!n) return [];
    if (Array.isArray(n)) return n.map((r) => [String(r?.label ?? r?.key ?? ""), String(r?.value ?? "")]);
    if (typeof n === "object") return Object.entries(n).map(([k, v]) => [k, String(v)]);
    return [];
  })();

  const body = [
    `<nav><a href="/">Inicio</a> › <a href="/productos">Productos</a> › ${esc(p.name)}</nav>`,
    `<h1>${esc(p.name)}</h1>`,
    p.main_image ? `<img src="${esc(absoluta(p.main_image))}" alt="${esc(p.name)}" width="480" />` : "",
    `<p class="precio">${esc(soles(precio))}${hayOferta ? `<span class="antes">${esc(soles(p.price))}</span>` : ""}</p>`,
    `<p>${esc(Number(p.stock ?? 0) > 0 ? "Disponible" : "Sin stock")}${p.brand ? ` · Marca: ${esc(p.brand)}` : ""}${p.size ? ` · Presentación: ${esc(p.size)}` : ""}</p>`,
    p.short_description ? `<p>${esc(p.short_description)}</p>` : "",
    p.description ? htmlSeguro(p.description) : "",
    p.usage_instructions ? `<h2>Modo de uso</h2>${htmlSeguro(p.usage_instructions)}` : "",
    p.ingredients ? `<h2>Ingredientes</h2>${htmlSeguro(p.ingredients)}` : "",
    nutricion.length
      ? `<h2>Información nutricional</h2><table><tbody>${nutricion
          .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`
      : "",
    bloqueFaqs(faqs),
  ].filter(Boolean).join("\n");

  const productoJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: resumen,
    image: galeria,
    sku: p.id,
    brand: { "@type": "Brand", name: p.brand || SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}${path}`,
      priceCurrency: "PEN",
      price: precio,
      availability: Number(p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const faqBloque = faqJsonLd(faqs);

  return {
    path,
    title: meta?.seo_title || `${p.name} | ${SITE_NAME}`,
    description: meta?.seo_description || resumen,
    image: meta?.og_image || p.main_image,
    canonical: meta?.canonical || undefined,
    noindex: !!meta?.noindex,
    jsonLd: [
      productoJsonLd,
      migaDePan([
        { name: "Inicio", path: "/" },
        ...(p.category ? [{ name: p.category, path: `/categoria/${String(p.category).toLowerCase()}` }] : []),
        { name: p.name, path },
      ]),
      ...(faqBloque ? [faqBloque] : []),
    ],
    body,
  };
}

function paginaCategoria(c, productos) {
  const path = `/categoria/${c.slug}`;
  const suyos = productos.filter(
    (p) => String(p.category ?? "").trim() === c.name || String(p.subcategory ?? "").trim() === c.name,
  );
  const resumen = c.short_description || plano(c.description) || `${c.name} en ${SITE_NAME}.`;

  const body = [
    `<nav><a href="/">Inicio</a> › ${esc(c.name)}</nav>`,
    `<h1>${esc(c.name)}</h1>`,
    c.description ? htmlSeguro(c.description) : `<p>${esc(resumen)}</p>`,
    c.long_description ? htmlSeguro(c.long_description) : "",
    suyos.length
      ? `<h2>Productos de ${esc(c.name)}</h2>${enlaces(
          suyos.map((p) => ({ nombre: p.name, path: `/producto/${p.slug}`, extra: soles(precioVigente(p)) })),
        )}`
      : "",
  ].filter(Boolean).join("\n");

  return {
    path,
    title: c.meta_title || `${c.name} | ${SITE_NAME}`,
    description: c.meta_description || resumen,
    image: c.image_url,
    canonical: c.canonical_url || undefined,
    jsonLd: [
      migaDePan([{ name: "Inicio", path: "/" }, { name: c.name, path }]),
      ...(suyos.length
        ? [{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: c.name,
            numberOfItems: suyos.length,
            itemListElement: suyos.map((p, i) => ({
              "@type": "ListItem", position: i + 1, name: p.name, url: `${BASE_URL}/producto/${p.slug}`,
            })),
          }]
        : []),
    ],
    body,
  };
}

function paginaLanding(l) {
  const path = landingPath(l.kind, l.slug);
  const faqs = faqsDe(l.faqs);
  const s = l.sections && typeof l.sections === "object" ? l.sections : {};
  const resumen = plano(l.intro) || plano(l.meta_description) || l.title;

  const seccion = (titulo, contenido) => {
    const html = htmlSeguro(contenido);
    return html ? `<h2>${esc(titulo)}</h2>${html.startsWith("<") ? html : `<p>${html}</p>`}` : "";
  };
  const itemsDe = (v, titulo) => {
    const items = lista(v).filter((i) => i?.title || i?.name);
    return items.length
      ? `<h2>${esc(titulo)}</h2><ul>${items
          .map((i) => `<li><strong>${esc(i.title || i.name)}</strong>${i.description ? `: ${esc(plano(i.description))}` : ""}</li>`)
          .join("")}</ul>`
      : "";
  };

  const body = [
    `<nav><a href="/">Inicio</a> › ${esc(l.title)}</nav>`,
    `<h1>${esc(l.title)}</h1>`,
    l.hero_image ? `<img src="${esc(absoluta(l.hero_image))}" alt="${esc(l.hero_image_alt || l.title)}" width="640" />` : "",
    l.intro ? `<p>${esc(plano(l.intro))}</p>` : "",
    seccion(s.what_is?.title || "Qué es", s.what_is?.content),
    l.body_html ? htmlSeguro(l.body_html) : "",
    itemsDe(s.causes, "Causas"),
    itemsDe(s.symptoms, "Síntomas"),
    seccion("Qué hacer", s.what_to_do),
    seccion("Alimentación", s.nutrition),
    itemsDe(s.nutrients, "Nutrientes"),
    itemsDe(s.ingredients, "Ingredientes"),
    seccion("Cuándo consultar a un profesional", s.professional_help),
    bloqueFaqs(faqs),
    l.long_description ? htmlSeguro(l.long_description) : "",
    lista(s.related_topics).length
      ? `<h2>Temas relacionados</h2>${enlaces(
          lista(s.related_topics)
            .filter((t) => t?.slug)
            .map((t) => ({ nombre: t.title || t.name || t.slug, path: t.href || `/beneficio/${t.slug}` })),
        )}`
      : "",
  ].filter(Boolean).join("\n");

  const faqBloque = faqJsonLd(faqs);

  return {
    path,
    title: l.meta_title || `${l.title} | ${SITE_NAME}`,
    description: l.meta_description || resumen,
    image: l.og_image || l.hero_image,
    canonical: l.canonical || undefined,
    noindex: !!l.noindex,
    ogType: "article",
    jsonLd: [
      migaDePan([{ name: "Inicio", path: "/" }, { name: l.title, path }]),
      ...(faqBloque ? [faqBloque] : []),
    ],
    body,
  };
}

function paginaBlog(b) {
  const path = `/blog/${b.slug}`;
  const resumen = b.excerpt || plano(b.content).slice(0, 200) || b.title;
  const body = [
    `<nav><a href="/">Inicio</a> › <a href="/blog">Blog</a> › ${esc(b.title)}</nav>`,
    `<h1>${esc(b.title)}</h1>`,
    b.cover_image ? `<img src="${esc(absoluta(b.cover_image))}" alt="${esc(b.title)}" width="640" />` : "",
    b.excerpt ? `<p>${esc(b.excerpt)}</p>` : "",
    b.content ? htmlSeguro(b.content) : "",
  ].filter(Boolean).join("\n");

  return {
    path,
    title: `${b.title} | ${SITE_NAME}`,
    description: resumen,
    image: b.cover_image,
    ogType: "article",
    publishedTime: b.published_at || undefined,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: b.title,
        description: resumen,
        image: b.cover_image ? [absoluta(b.cover_image)] : undefined,
        datePublished: b.published_at || undefined,
        dateModified: b.updated_at || b.published_at || undefined,
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: `${BASE_URL}${path}`,
      },
      migaDePan([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog" }, { name: b.title, path }]),
    ],
    body,
  };
}

function paginaObjetivo(g, productos) {
  const path = `/objetivo/${g.slug}`;
  const suyos = productos.filter((p) => String(p.goal ?? "").trim() === g.name);
  const resumen = g.short_description || plano(g.long_description) || `${g.name} en ${SITE_NAME}.`;

  return {
    path,
    title: g.title_seo || `${g.name} | ${SITE_NAME}`,
    description: g.meta_description || resumen,
    image: g.image_url,
    canonical: g.canonical_url || undefined,
    jsonLd: [migaDePan([{ name: "Inicio", path: "/" }, { name: "Objetivos", path: "/objetivos" }, { name: g.name, path }])],
    body: [
      `<nav><a href="/">Inicio</a> › <a href="/objetivos">Objetivos</a> › ${esc(g.name)}</nav>`,
      `<h1>${esc(g.name)}</h1>`,
      `<p>${esc(resumen)}</p>`,
      g.long_description ? htmlSeguro(g.long_description) : "",
      suyos.length
        ? `<h2>Productos para ${esc(g.name)}</h2>${enlaces(suyos.map((p) => ({ nombre: p.name, path: `/producto/${p.slug}` })))}`
        : "",
    ].filter(Boolean).join("\n"),
  };
}

/**
 * Páginas informativas cuyo texto vive en componentes de React, no en la base.
 *
 * Aquí no se puede reproducir su contenido, pero sí lo importante: que cada una
 * declare su propio título y su propia canónica. Sin esto caerían en el
 * `index.html` de reserva y un rastreador sin JavaScript vería el contenido de
 * la portada repetido en cada URL.
 *
 * Las rutas en inglés son históricas: su canónica apunta a la española, igual
 * que hace la aplicación.
 */
const PAGINAS_FIJAS = [
  { path: "/blog", title: `Blog | ${SITE_NAME}`, h1: "Blog",
    description: "Artículos sobre superalimentos andinos, nutrición y bienestar natural." },
  { path: "/objetivos", title: `Objetivos | ${SITE_NAME}`, h1: "Objetivos",
    description: "Encuentra productos según lo que quieras lograr: energía, defensas, digestión, control de peso y más." },
  { path: "/nosotros", title: `Sobre nosotros | ${SITE_NAME}`, h1: "Sobre nosotros",
    description: "Quiénes somos: superalimentos andinos puros, sin saborizantes ni químicos, con envío a todo el Perú." },
  { path: "/contacto", title: `Contacto | ${SITE_NAME}`, h1: "Contacto",
    description: "Escríbenos para consultas sobre pedidos, productos o envíos a cualquier parte del Perú." },
  { path: "/programa-revendedor", title: `Programa revendedor | ${SITE_NAME}`, h1: "Programa revendedor",
    description: "Revende superalimentos andinos de Nutribatidos con precios mayoristas y soporte." },
  { path: "/vende-con-nosotros", title: `Vende con nosotros | ${SITE_NAME}`, h1: "Vende con nosotros",
    description: "Ofrece tus productos naturales en Nutribatidos y llega a clientes de todo el Perú." },
  { path: "/politica-de-envios", title: `Política de envío | ${SITE_NAME}`, h1: "Política de envío",
    description: "Plazos, costos y cobertura de los envíos de Nutribatidos en todo el Perú." },
  { path: "/shipping-policies", canonical: "/politica-de-envios", title: `Política de envío | ${SITE_NAME}`, h1: "Política de envío",
    description: "Plazos, costos y cobertura de los envíos de Nutribatidos en todo el Perú." },
  { path: "/politica-de-devoluciones", title: `Política de devoluciones | ${SITE_NAME}`, h1: "Política de devoluciones",
    description: "Cómo solicitar un cambio o devolución de tu pedido en Nutribatidos." },
  { path: "/returns-policies", canonical: "/politica-de-devoluciones", title: `Política de devoluciones | ${SITE_NAME}`, h1: "Política de devoluciones",
    description: "Cómo solicitar un cambio o devolución de tu pedido en Nutribatidos." },
  { path: "/terminos-y-condiciones", title: `Términos y condiciones | ${SITE_NAME}`, h1: "Términos y condiciones",
    description: "Condiciones de uso de la tienda y de compra en Nutribatidos." },
  { path: "/terms-and-conditions", canonical: "/terminos-y-condiciones", title: `Términos y condiciones | ${SITE_NAME}`, h1: "Términos y condiciones",
    description: "Condiciones de uso de la tienda y de compra en Nutribatidos." },
  { path: "/politica-de-privacidad", title: `Política de privacidad | ${SITE_NAME}`, h1: "Política de privacidad",
    description: "Qué datos recogemos en Nutribatidos, para qué los usamos y cómo ejercer tus derechos." },
  { path: "/privacy", canonical: "/politica-de-privacidad", title: `Política de privacidad | ${SITE_NAME}`, h1: "Política de privacidad",
    description: "Qué datos recogemos en Nutribatidos, para qué los usamos y cómo ejercer tus derechos." },
  { path: "/politica-de-cookies", title: `Política de cookies | ${SITE_NAME}`, h1: "Política de cookies",
    description: "Cómo usamos cookies en Nutribatidos y cómo configurarlas." },
];

// ------------------------------------------------------------------ ejecución

(async () => {
  let plantilla;
  try {
    plantilla = plantillaLimpia(readFileSync(resolve(DIST, "index.html"), "utf8"));
  } catch {
    console.warn("prerender: no existe dist/index.html — ¿corrió `vite build`? Se omite.");
    return;
  }
  if (!plantilla.includes('<div id="root"></div>')) {
    console.warn('prerender: dist/index.html no tiene el <div id="root"> esperado. Se omite.');
    return;
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const [{ data: products }, { data: cats }, { data: posts }, { data: landings }, { data: metas }, { data: goals }] =
    await Promise.all([
      sb.from("products")
        .select("id, slug, name, description, short_description, price, sale_price, main_image, gallery_images, stock, brand, category, subcategory, goal, size, faqs, ingredients, usage_instructions, nutrition_facts")
        .eq("is_active", true).eq("approval_status", "approved"),
      sb.from("categories")
        .select("id, slug, name, description, long_description, short_description, meta_title, meta_description, image_url, canonical_url, type, is_active, show_in_sitemap"),
      sb.from("blog_posts")
        .select("slug, title, excerpt, content, cover_image, published_at, updated_at")
        .eq("is_published", true),
      sb.from("seo_landing_pages").select("*").eq("is_published", true),
      sb.from("seo_meta").select("*").eq("entity_type", "product"),
      sb.from("goals")
        .select("slug, name, short_description, long_description, meta_description, title_seo, image_url, canonical_url, is_active, show_in_sitemap"),
    ]);

  const metaPorProducto = new Map();
  (metas ?? []).forEach((m) => metaPorProducto.set(m.entity_id, m));

  const listaProductos = products ?? [];
  const categoriasVisibles = (cats ?? []).filter(
    (c) => c.type === "product" && c.is_active !== false && c.show_in_sitemap !== false,
  );
  const paginas = [];

  listaProductos.forEach((p) => paginas.push(paginaProducto(p, metaPorProducto.get(p.id))));
  categoriasVisibles.forEach((c) => paginas.push(paginaCategoria(c, listaProductos)));
  (posts ?? []).forEach((b) => paginas.push(paginaBlog(b)));
  (landings ?? []).forEach((l) => paginas.push(paginaLanding(l)));
  (goals ?? [])
    .filter((g) => g.is_active !== false && g.show_in_sitemap !== false)
    .forEach((g) => paginas.push(paginaObjetivo(g, listaProductos)));

  PAGINAS_FIJAS.forEach((f) =>
    paginas.push({
      path: f.path,
      title: f.title,
      description: f.description,
      canonical: f.canonical,
      jsonLd: [migaDePan([{ name: "Inicio", path: "/" }, { name: f.h1, path: f.canonical ?? f.path }])],
      body: [
        `<nav><a href="/">Inicio</a> › ${esc(f.h1)}</nav>`,
        `<h1>${esc(f.h1)}</h1>`,
        `<p>${esc(f.description)}</p>`,
      ].join("\n"),
    }),
  );

  // Portada y listado: sin ellas, la puerta de entrada del sitio seguiría
  // siendo un HTML vacío para quien no ejecuta JavaScript.
  paginas.push({
    path: "/",
    title: `${SITE_NAME} | Superalimentos Andinos y Medicina Natural`,
    description: "Maca, cañihua, espirulina y fórmulas naturales peruanas. Envíos a todo el Perú. Pago con Yape, Plin o tarjeta.",
    body: [
      `<h1>${SITE_NAME}</h1>`,
      `<p>Superalimentos andinos puros, sin saborizantes ni químicos. Envíos a todo el Perú.</p>`,
      `<h2>Categorías</h2>`,
      enlaces(categoriasVisibles.map((c) => ({ nombre: c.name, path: `/categoria/${c.slug}` }))),
      `<h2>Productos</h2>`,
      enlaces(listaProductos.map((p) => ({ nombre: p.name, path: `/producto/${p.slug}` }))),
    ].join("\n"),
  });

  paginas.push({
    path: "/productos",
    title: `Productos | ${SITE_NAME}`,
    description: `Catálogo completo de ${SITE_NAME}: superalimentos andinos, proteínas, colágeno y fórmulas naturales con envío a todo el Perú.`,
    body: [
      `<nav><a href="/">Inicio</a> › Productos</nav>`,
      `<h1>Productos</h1>`,
      enlaces(listaProductos.map((p) => ({
        nombre: p.name, path: `/producto/${p.slug}`, extra: soles(precioVigente(p)),
      }))),
    ].join("\n"),
  });

  let escritas = 0;
  for (const p of paginas) {
    try { escribir(p, plantilla); escritas++; }
    catch (e) { console.warn(`prerender: falló ${p.path}: ${e.message}`); }
  }

  console.log(
    `prerender: ${escritas}/${paginas.length} páginas ` +
    `(productos=${listaProductos.length} categorías=${categoriasVisibles.length} ` +
    `blog=${(posts ?? []).length} landings=${(landings ?? []).length} objetivos=${(goals ?? []).length})`,
  );
})().catch((e) => {
  console.warn("prerender: falló por completo, el sitio queda como estaba:", e.message);
});
