// Dominio: revisión y arreglo de SEO.
//
// Las herramientas de escritura no reimplementan nada: invocan las funciones
// que ya usa el panel. Lo importante es CÓMO las invocan, porque ahí está la
// barrera de seguridad y es deliberada:
//
//   - Productos: siempre en modo `fix_to_100` con `overwrite_existing` en
//     false. Eso regenera únicamente los campos que incumplen las reglas y no
//     toca el contenido del producto. El agente arregla lo roto; nunca pisa lo
//     que ya estaba bien.
//   - Blog y categorías: generan una PROPUESTA en `seo_suggestions` con estado
//     pendiente. No tocan el SEO en vivo; tú apruebas desde el panel.
//   - Landings: se crean siempre como borrador (`publish: false`).
//
// Lo que se dejó fuera a propósito: sobrescribir campos correctos y publicar
// landings. Son las dos acciones de las que cuesta volver, y ninguna es
// urgente para "revisar y arreglar el SEO".

import { type AIProvider, getProviderConfig } from "../../ai-provider.ts";
import { runSeoAudit } from "../../seo/audit.ts";
import { scoreCategory, scoreLanding, scoreProduct } from "../../seo/rubric.ts";
import { invokeError, invokeFunction } from "../invoke.ts";
import type { AgentContext, AgentDomain, AgentTool } from "../types.ts";

/**
 * Proveedor de IA para las funciones de generación.
 *
 * En el panel lo elige el usuario en un desplegable; aquí no hay desplegable,
 * así que se toma el primero que tenga clave. `product-seo-generate` responde
 * 400 si la clave del proveedor que recibe no está configurada, y su valor por
 * defecto es openai — que no todas las instalaciones usan.
 */
function generationProvider(): AIProvider {
  const order: AIProvider[] = ["openai", "lovable", "deepseek", "gemini", "anthropic"];
  return order.find((p) => getProviderConfig(p).hasKey) ?? "openai";
}

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

// --------------------------------------------------------------------------
// Escritura acotada
// --------------------------------------------------------------------------

/** Busca un producto activo por nombre o slug. */
async function findProduct(ctx: AgentContext, q: string): Promise<any | null> {
  const { data } = await ctx.supabase.from("products")
    .select("id, name, slug")
    .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
    .eq("is_active", true).limit(1);
  return (data as any[])?.[0] ?? null;
}

const arreglarProducto: AgentTool = {
  name: "arreglar_producto",
  description:
    "Arregla el SEO de un producto: regenera SOLO los campos que incumplen las reglas (título, meta descripción, palabras clave, textos, alt de imágenes) y no toca el contenido del producto ni los campos que ya estaban correctos. Úsala cuando el usuario pida corregir o completar el SEO de un producto concreto.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      producto: {
        type: "string",
        description: "Nombre o slug del producto. También se acepta su UUID.",
      },
    },
    required: ["producto"],
  },
  async run(args, ctx: AgentContext) {
    const q = String(args?.producto ?? "").trim();
    if (!q) return { error: "Indica qué producto arreglar." };

    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    const producto = esUuid ? { id: q, name: q } : await findProduct(ctx, q);
    if (!producto) return { error: `No encontré ningún producto activo que coincida con "${q}".` };

    // fix_to_100 regenera únicamente lo que falla; overwrite_existing queda en
    // false para no pisar campos que ya estaban bien.
    const res = await invokeFunction(ctx, "product-seo-generate", {
      product_id: producto.id,
      provider: generationProvider(),
      fix_to_100: true,
      overwrite_existing: false,
    });
    if (!res.ok) return { error: invokeError("product-seo-generate", res) };

    ctx.actions.push({
      action: "seo_fix_product",
      product_id: producto.id,
      name: producto.name,
    });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "update",
      target_table: "seo_meta", target_id: producto.id, product_id: producto.id,
      after_value: res.body,
    });

    return {
      ok: true,
      producto: producto.name,
      detalle: res.body,
      nota: "Solo se regeneraron los campos que incumplían las reglas. Los que ya estaban correctos quedaron intactos.",
    };
  },
};

const proponerSeo: AgentTool = {
  name: "proponer_seo",
  description:
    "Genera una PROPUESTA de SEO para un artículo del blog o una categoría y la deja pendiente de aprobación; no cambia nada en vivo. Úsala para blog y categorías. Para productos usa arreglar_producto, que sí aplica directamente.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["blog", "category"],
        description: "Tipo de entidad.",
      },
      busqueda: {
        type: "string",
        description: "Título o slug del artículo, o nombre de la categoría.",
      },
    },
    required: ["tipo", "busqueda"],
  },
  async run(args, ctx: AgentContext) {
    const tipo = String(args?.tipo ?? "").trim();
    const q = String(args?.busqueda ?? "").trim();
    if (!["blog", "category"].includes(tipo)) return { error: "tipo debe ser blog o category." };
    if (!q) return { error: "Indica qué entidad." };

    const tabla = tipo === "blog" ? "blog_posts" : "categories";
    const campo = tipo === "blog" ? "title" : "name";
    const { data } = await ctx.supabase.from(tabla)
      .select(`id, ${campo}, slug`)
      .or(`${campo}.ilike.%${q}%,slug.ilike.%${q}%`).limit(1);
    const row = (data as any[])?.[0];
    if (!row) return { error: `No encontré ninguna entidad de tipo ${tipo} que coincida con "${q}".` };

    const res = await invokeFunction(ctx, "seo-generate", {
      entity_type: tipo,
      entity_id: row.id,
    });
    if (!res.ok) return { error: invokeError("seo-generate", res) };

    ctx.actions.push({ action: "seo_proposal", entity_type: tipo, entity_id: row.id, name: row[campo] });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "create",
      target_table: "seo_suggestions", target_id: row.id, after_value: res.body,
    });

    return {
      ok: true,
      tipo,
      nombre: row[campo],
      propuesta: res.body,
      nota: "Queda como propuesta pendiente. No cambia nada del sitio hasta que la apruebes en el panel.",
    };
  },
};

const crearLandingBorrador: AgentTool = {
  name: "crear_landing_borrador",
  description:
    "Crea una landing de SEO en BORRADOR para una palabra clave concreta, sin publicarla. Úsala cuando una búsqueda sin resultados o una oportunidad detectada merezca su propia página.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "Palabra clave objetivo, tal como la buscaría una persona.",
      },
      tipo: {
        type: "string",
        enum: ["objetivo", "ingrediente", "beneficio"],
        description: "Qué clase de landing. Por defecto objetivo.",
      },
    },
    required: ["keyword"],
  },
  async run(args, ctx: AgentContext) {
    const keyword = String(args?.keyword ?? "").trim();
    if (!keyword) return { error: "Indica la palabra clave objetivo." };
    const kind = ["objetivo", "ingrediente", "beneficio"].includes(args?.tipo)
      ? args.tipo
      : "objetivo";

    // publish en false siempre: el agente prepara, el humano publica.
    const res = await invokeFunction(ctx, "ai-seo-landing-generate", {
      keyword,
      kind,
      publish: false,
    });
    if (!res.ok) return { error: invokeError("ai-seo-landing-generate", res) };

    ctx.actions.push({ action: "seo_landing_draft", keyword, kind });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "create",
      target_table: "seo_landing_pages", after_value: res.body,
    });

    return {
      ok: true,
      keyword,
      tipo: kind,
      detalle: res.body,
      nota: "Se creó como borrador. Revísala y publícala desde el panel cuando esté a tu gusto.",
    };
  },
};

const guardarPuntajes: AgentTool = {
  name: "guardar_puntajes",
  description:
    "Recalcula el puntaje de SEO de todos los productos y lo guarda en la base de datos. Úsala cuando el usuario quiera que el panel y sus exportaciones muestren los puntajes reales, o después de arreglar varios productos.",
  risk: "write",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: AgentContext) {
    const report = await runSeoAudit(ctx.supabase, { persistScores: true });
    const productos = report.resumen.find((r) => r.family === "producto");

    await ctx.audit({
      role: "tool", tool_name: this.name, action: "update",
      target_table: "seo_meta", after_value: { resumen: productos },
    });

    return {
      ok: true,
      productos_evaluados: productos?.total ?? 0,
      score_promedio: productos?.scorePromedio ?? 0,
      detalle: report.limitaciones.filter((l) => l.includes("puntaje")),
      nota:
        "Solo se actualizaron los productos que ya tenían ficha de SEO. Los que no la tienen siguen contando como 'sin SEO' y no se les inventó una.",
    };
  },
};

const listarPropuestas: AgentTool = {
  name: "listar_propuestas",
  description:
    "Lista las propuestas de SEO pendientes de aprobación. Úsala para saber qué hay esperando revisión.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      limite: { type: "integer", description: "Cuántas devolver (1-50). Por defecto 20." },
    },
  },
  async run(args, ctx: AgentContext) {
    const limite = Math.min(Math.max(Number(args?.limite) || 20, 1), 50);
    const { data, error } = await ctx.supabase.from("seo_suggestions")
      .select("id, entity_type, entity_id, status, seo_title, created_at")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(limite);
    if (error) return { error: error.message };

    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "search",
      target_table: "seo_suggestions", tool_result: { count: data?.length ?? 0 },
    });
    return { count: data?.length ?? 0, propuestas: data ?? [] };
  },
};

export const seoDomain: AgentDomain = {
  key: "seo",
  title: "SEO",
  description:
    "SEO del sitio: auditar todo (productos, categorías, landings, blog), listar las páginas peor posicionadas, revisar una página a fondo, arreglar el SEO de un producto, proponer SEO para blog y categorías, y crear landings en borrador. Úsalo para cualquier pregunta o encargo sobre posicionamiento, títulos, meta descripciones, duplicados, redirecciones o indexación.",
  system: `Eres el especialista de SEO de Nutribatidos (tienda peruana de suplementos).
Auditas, explicas y arreglas.

Qué puedes cambiar y qué no:
- arreglar_producto aplica de inmediato, pero solo regenera los campos que incumplen las reglas: nunca pisa un campo que ya estaba correcto ni toca el contenido del producto.
- proponer_seo (blog y categorías) deja una propuesta pendiente. No cambia nada en vivo.
- crear_landing_borrador crea la página sin publicar.
- No puedes sobrescribir campos correctos ni publicar landings. Si el usuario lo pide, dile que eso se hace desde el panel y por qué está fuera de tu alcance.

Cómo trabajas:
- Para cualquier pregunta general, empieza por auditar_sitio: trae el estado completo ya calculado.
- Antes de arreglar varios productos, di cuáles vas a tocar y espera el visto bueno. Uno suelto que el usuario ya nombró no necesita confirmación.
- Después de arreglar, di en una frase qué campos se regeneraron.
- Nunca inventes cifras. Todos los números salen de las herramientas.
- La cobertura del resumen (conSeo/sinSeo) mide exactamente lo que dice su campo \`criterio\`, y nada más. Dilo en esos términos ("tienen meta título o descripción"), no como "tienen SEO": una página puede contar como cubierta y aun así fallar casi todo lo demás. Si viene en null, esa familia no tiene cobertura que medir — dilo, no des un porcentaje.
- La cobertura es el piso, no la nota. Si el resumen dice que la mitad está cubierta pero los problemas de contenido afectan a casi todo el catálogo, manda lo segundo: eso es lo que ve Google.
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
  tools: [
    auditarSitio,
    listarPeores,
    revisarPagina,
    listarPropuestas,
    arreglarProducto,
    proponerSeo,
    crearLandingBorrador,
    guardarPuntajes,
  ],
};
