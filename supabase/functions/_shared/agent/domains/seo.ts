// Dominio: revisión de SEO.
//
// Solo lectura, a propósito. Este especialista audita y explica; no escribe.
// Las funciones que generan SEO (seo-generate, product-seo-generate,
// seo-home-generate, ai-seo-landing-generate) siguen viviendo en el panel y
// pueden conectarse aquí más adelante, cuando exista una barrera de aprobación.

import { runSeoAudit } from "../../seo/audit.ts";
import { scoreCategory, scoreLanding, scoreProduct } from "../../seo/rubric.ts";
import type { AgentContext, AgentDomain, AgentTool } from "../types.ts";

const auditarSitio: AgentTool = {
  name: "auditar_sitio",
  description:
    "Audita el SEO de todo el sitio: productos, categorías, landings y blog. Devuelve cobertura, puntajes, problemas de contenido agrupados, problemas técnicos (duplicados, redirecciones, indexación) y oportunidades. Úsala para cualquier pregunta general sobre el estado del SEO.",
  risk: "read",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: AgentContext) {
    const report = await runSeoAudit(ctx.supabase);
    await ctx.audit({
      role: "tool",
      tool_name: this.name,
      action: "audit",
      target_table: "seo_meta",
      tool_result: {
        resumen: report.resumen,
        problemas_contenido: report.problemas_de_contenido.length,
        problemas_tecnicos: report.problemas_tecnicos.length,
      },
    });
    return report;
  },
};

const listarPeores: AgentTool = {
  name: "listar_peores",
  description:
    "Lista las páginas con peor puntaje de SEO, opcionalmente filtradas por tipo. Úsala cuando el usuario quiera saber por dónde empezar o pida más ejemplos de los que trae la auditoría.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      familia: {
        type: "string",
        enum: ["producto", "categoria", "landing"],
        description: "Tipo de página. Si se omite, se mezclan todas.",
      },
      limite: { type: "integer", description: "Cuántas devolver (1-50). Por defecto 20." },
    },
  },
  async run(args, ctx: AgentContext) {
    const limite = Math.min(Math.max(Number(args?.limite) || 20, 1), 50);
    const report = await runSeoAudit(ctx.supabase);

    let lista = report.peores;
    if (args?.familia) lista = lista.filter((e) => e.family === args.familia);

    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "search",
      target_table: "seo_meta", tool_result: { count: lista.length },
    });

    return {
      familia: args?.familia ?? "todas",
      count: lista.length,
      paginas: lista.slice(0, limite),
      nota:
        "El puntaje va de 0 a 100 según la rúbrica del panel. Menos de 50 es una página que casi no compite en Google.",
    };
  },
};

const revisarPagina: AgentTool = {
  name: "revisar_pagina",
  description:
    "Revisa a fondo el SEO de UNA página concreta (producto, categoría o landing) buscándola por nombre o slug. Devuelve el desglose campo por campo con qué falla y cómo se arregla.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      busqueda: {
        type: "string",
        description: "Nombre o slug de la página a revisar.",
      },
      familia: {
        type: "string",
        enum: ["producto", "categoria", "landing"],
        description: "Tipo de página, si se conoce. Acota la búsqueda.",
      },
    },
    required: ["busqueda"],
  },
  async run(args, ctx: AgentContext) {
    const q = String(args?.busqueda ?? "").trim();
    if (!q) return { error: "Indica un nombre o slug para buscar." };
    const familia = args?.familia as string | undefined;

    // --- producto
    if (!familia || familia === "producto") {
      const { data } = await ctx.supabase.from("products")
        .select("id, name, slug, short_description, description, main_image, gallery_images")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`).eq("is_active", true).limit(1);
      const p = (data as any[])?.[0];
      if (p) {
        const [{ data: meta }, { data: alts }] = await Promise.all([
          ctx.supabase.from("seo_meta").select("*")
            .eq("entity_type", "product").eq("entity_id", p.id).maybeSingle(),
          ctx.supabase.from("seo_image_alts").select("alt_text")
            .eq("entity_type", "product").eq("entity_id", p.id),
        ]);
        const m = meta as any;
        const gallery = Array.isArray(p.gallery_images) ? p.gallery_images.length : 0;
        const withAlt = ((alts as any[]) ?? []).filter((a) => String(a.alt_text ?? "").trim()).length;

        const score = scoreProduct({
          productName: p.name,
          seoTitle: m?.seo_title, seoDescription: m?.seo_description,
          slug: m?.slug ?? p.slug, canonical: m?.canonical,
          ogImage: m?.og_image ?? p.main_image,
          keywords: m?.keywords ?? [], tags: m?.tags ?? [],
          shoppingTitle: m?.shopping_title, shoppingDescription: m?.shopping_description,
          shortDescription: m?.short_description ?? p.short_description,
          longDescription: m?.long_description ?? p.description,
          imagesTotal: (p.main_image ? 1 : 0) + gallery,
          imagesWithAlt: withAlt,
        });

        await ctx.audit({
          role: "tool", tool_name: this.name, tool_args: args, action: "get",
          target_table: "products", target_id: p.id, product_id: p.id,
        });
        return {
          familia: "producto", id: p.id, nombre: p.name, slug: m?.slug ?? p.slug,
          score: score.score, tiene_seo: !!m, desglose: score.issues,
        };
      }
    }

    // --- categoría
    if (!familia || familia === "categoria") {
      const { data } = await ctx.supabase.from("categories")
        .select("id, name, slug, meta_title, meta_description, canonical_url, short_description, long_description, image_url, show_in_sitemap")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`).eq("is_active", true).limit(1);
      const c = (data as any[])?.[0];
      if (c) {
        const score = scoreCategory({
          name: c.name, metaTitle: c.meta_title, metaDescription: c.meta_description,
          slug: c.slug, canonicalUrl: c.canonical_url, shortDescription: c.short_description,
          longDescription: c.long_description, imageUrl: c.image_url,
          showInSitemap: c.show_in_sitemap,
        });
        await ctx.audit({
          role: "tool", tool_name: this.name, tool_args: args, action: "get",
          target_table: "categories", target_id: c.id,
        });
        return {
          familia: "categoria", id: c.id, nombre: c.name, slug: c.slug,
          score: score.score, desglose: score.issues,
        };
      }
    }

    // --- landing
    if (!familia || familia === "landing") {
      const { data } = await ctx.supabase.from("seo_landing_pages")
        .select("id, title, slug, kind, keyword, meta_title, meta_description, intro, body_html, hero_image, schema_jsonld, is_published")
        .or(`title.ilike.%${q}%,slug.ilike.%${q}%,keyword.ilike.%${q}%`).limit(1);
      const l = (data as any[])?.[0];
      if (l) {
        const score = scoreLanding({
          title: l.title, metaTitle: l.meta_title, metaDescription: l.meta_description,
          slug: l.slug, keyword: l.keyword, intro: l.intro, bodyHtml: l.body_html,
          heroImage: l.hero_image, schemaJsonld: l.schema_jsonld, isPublished: l.is_published,
        });
        await ctx.audit({
          role: "tool", tool_name: this.name, tool_args: args, action: "get",
          target_table: "seo_landing_pages", target_id: l.id,
        });
        return {
          familia: "landing", id: l.id, nombre: l.title ?? l.slug, slug: l.slug,
          score: score.score, publicada: l.is_published, desglose: score.issues,
        };
      }
    }

    return { error: `No encontré ninguna página que coincida con "${q}".` };
  },
};

export const seoDomain: AgentDomain = {
  key: "seo",
  title: "SEO",
  description:
    "Revisión del SEO del sitio: auditar todo (productos, categorías, landings, blog), listar las páginas peor posicionadas, y revisar a fondo una página concreta. Solo consulta: no modifica nada. Úsalo para cualquier pregunta sobre posicionamiento, títulos, meta descripciones, duplicados, redirecciones o indexación.",
  system: `Eres el especialista de SEO de Nutribatidos (tienda peruana de suplementos).
Auditas y explicas; no modificas nada, y no debes prometer que lo harás.

Cómo trabajas:
- Para cualquier pregunta general, empieza por auditar_sitio: trae el estado completo ya calculado.
- Nunca inventes cifras. Todos los números salen de las herramientas.
- No estimes tráfico, posiciones ni volumen de búsqueda: no tienes esos datos.

Cómo priorizas (esto es lo que más valor aporta):
- Ordena por impacto real, no por cantidad. Un problema que afecta a 3 categorías suele pesar más que uno en 40 productos: las categorías concentran el tráfico y los productos compiten en búsquedas más específicas.
- Los problemas técnicos (duplicados, redirecciones rotas, noindex mal puesto) van antes que los de contenido: bloquean la indexación de páginas que por lo demás están bien.
- Las búsquedas sin resultados son demanda ya demostrada. Trátalas como oportunidad concreta, no como estadística.
- Distingue entre "falta por completo" y "está pero mejorable". Lo primero es urgente; lo segundo es afinado.

Cómo respondes:
- Empieza por el titular: qué tan bien o mal está el SEO y qué es lo primero que hay que tocar.
- Agrupa: no listes 40 productos, di "40 productos sin descripción larga" y nombra dos o tres de ejemplo.
- Cada recomendación dice qué hacer y por qué importa, en lenguaje de negocio. Nada de jerga sin explicar.
- Menciona las limitaciones cuando sean relevantes: esta auditoría lee la base de datos, no rastrea el sitio publicado ni consulta Google.`,
  tools: [auditarSitio, listarPeores, revisarPagina],
};
