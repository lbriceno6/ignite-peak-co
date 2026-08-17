// Dominio: catálogo de productos.
//
// Estas herramientas venían de `admin-agent/index.ts` y conservan su
// comportamiento. Los dos cambios son transversales, no de lógica:
//   - la auditoría llena `target_table` / `target_id` además de `product_id`;
//   - cada herramienta declara su nivel de riesgo.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { AgentContext, AgentDomain, AgentTool } from "../types.ts";

/** Campos editables sobre la tabla `products`. */
const EDITABLE_FIELDS = [
  "name", "slug", "short_description", "description", "price", "sale_price",
  "category", "subcategory", "main_ingredient", "goal", "flavor", "size",
  "stock", "is_active", "badge", "usage_instructions", "ingredients",
];

const PRODUCT_SELECT =
  "id, name, slug, short_description, price, sale_price, category, subcategory, stock, is_active, badge, flavor, size, goal, main_ingredient";

/** Mismo bucket que usa ProductForm en el panel. */
const IMAGE_BUCKET = "blog-images";

const TABLE = "products";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Normaliza `gallery_images` (jsonb) a un arreglo de URLs. */
function normalizeGallery(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((u): u is string => typeof u === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
    } catch { /* no era JSON: se trata como lista por saltos de línea */ }
    return value.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Sube un data-URL base64 a Storage y devuelve la URL pública. */
async function uploadDataUrl(service: SupabaseClient, dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/s);
  if (!m) {
    if (/^https?:\/\//.test(dataUrl)) return dataUrl;
    throw new Error("Formato de imagen no reconocido (se esperaba data-URL base64).");
  }
  const contentType = m[1] || "image/png";
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = (contentType.split("/")[1] || "png").split(";")[0].replace("jpeg", "jpg");
  const path = `product-ai-${crypto.randomUUID()}.${ext}`;
  const { error } = await service.storage.from(IMAGE_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage: ${error.message}`);
  return service.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Lee un producto por id. Devuelve `null` si no existe. */
async function getProductRow(ctx: AgentContext, id: string, columns = "*"): Promise<any | null> {
  const { data } = await ctx.supabase.from(TABLE).select(columns).eq("id", id).maybeSingle();
  return (data as any) ?? null;
}

const searchProducts: AgentTool = {
  name: "search_products",
  description:
    "Busca productos del catálogo por texto (nombre), categoría y/o estado. Devuelve una lista resumida.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Texto a buscar en el nombre del producto." },
      category: { type: "string", description: "Filtrar por categoría exacta." },
      status: {
        type: "string",
        enum: ["active", "inactive", "all"],
        description: "Filtrar por estado. Por defecto all.",
      },
      limit: { type: "integer", description: "Máximo de resultados (1-25). Por defecto 10." },
    },
  },
  async run(args, ctx) {
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 25);
    let q = ctx.supabase.from(TABLE).select(PRODUCT_SELECT)
      .order("updated_at", { ascending: false }).limit(limit);
    if (args?.query) q = q.ilike("name", `%${args.query}%`);
    if (args?.category) q = q.eq("category", args.category);
    if (args?.status === "active") q = q.eq("is_active", true);
    if (args?.status === "inactive") q = q.eq("is_active", false);

    const { data, error } = await q;
    if (error) return { error: error.message };
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "search",
      target_table: TABLE, tool_result: { count: data?.length ?? 0 },
    });
    return { count: data?.length ?? 0, products: data ?? [] };
  },
};

const getProduct: AgentTool = {
  name: "get_product",
  description: "Obtiene el detalle de un producto por id o por slug.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "UUID del producto." },
      slug: { type: "string", description: "Slug del producto." },
    },
  },
  async run(args, ctx) {
    if (!args?.id && !args?.slug) return { error: "Indica id o slug." };
    let q = ctx.supabase.from(TABLE).select("*").limit(1);
    q = args?.id ? q.eq("id", args.id) : q.eq("slug", args.slug);
    const { data, error } = await q.maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Producto no encontrado." };
    const row = data as any;
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "get",
      target_table: TABLE, target_id: row.id, product_id: row.id,
    });
    return { product: row };
  },
};

const createProduct: AgentTool = {
  name: "create_product",
  description: "Crea un nuevo producto en el catálogo. Requiere al menos nombre y precio.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      sale_price: { type: "number" },
      short_description: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      stock: { type: "integer" },
      is_active: {
        type: "boolean",
        description: "Por defecto false (borrador) hasta que el admin confirme.",
      },
      slug: { type: "string", description: "Opcional; si no se da, se genera del nombre." },
      main_image: {
        type: "string",
        description: "URL de imagen principal. Opcional; si hay imagen adjunta en el chat se usa esa.",
      },
    },
    required: ["name", "price"],
  },
  async run(args, ctx) {
    if (!args?.name || args?.price == null) return { error: "Se requieren al menos name y price." };

    const payload: Record<string, unknown> = {
      name: args.name,
      slug: args.slug ? slugify(args.slug) : slugify(args.name),
      price: Number(args.price),
      is_active: args.is_active ?? false,
    };
    const mainImg = args.main_image || ctx.attachedImageUrl;
    if (mainImg) payload.main_image = mainImg;
    for (const f of ["sale_price", "short_description", "description", "category", "stock"]) {
      if (args[f] != null) {
        payload[f] = f === "sale_price"
          ? Number(args[f])
          : f === "stock"
          ? Math.trunc(Number(args[f]))
          : args[f];
      }
    }

    const { data, error } = await ctx.supabase.from(TABLE).insert(payload)
      .select(PRODUCT_SELECT).single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({ action: "create", product_id: row.id, name: row.name, after: row });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "create",
      target_table: TABLE, target_id: row.id, product_id: row.id, after_value: row,
    });
    return { ok: true, product: row };
  },
};

const updateProduct: AgentTool = {
  name: "update_product",
  description:
    "Actualiza campos de un producto existente. Indica el id y solo los campos a cambiar.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "UUID del producto a editar." },
      fields: {
        type: "object",
        description: "Mapa de campos a actualizar. Permitidos: " + EDITABLE_FIELDS.join(", "),
      },
    },
    required: ["id", "fields"],
  },
  async run(args, ctx) {
    if (!args?.id || !args?.fields || typeof args.fields !== "object") {
      return { error: "Indica id y fields." };
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args.fields)) {
      if (!EDITABLE_FIELDS.includes(k)) continue;
      if (k === "price" || k === "sale_price") patch[k] = v == null ? null : Number(v);
      else if (k === "stock") patch[k] = Math.trunc(Number(v));
      else if (k === "slug") patch[k] = slugify(String(v));
      else patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return { error: "Ningún campo editable válido en fields." };
    }

    const before = await getProductRow(ctx, args.id);
    if (!before) return { error: "Producto no encontrado." };

    patch.updated_at = new Date().toISOString();
    const { data, error } = await ctx.supabase.from(TABLE).update(patch).eq("id", args.id)
      .select(PRODUCT_SELECT).single();
    if (error) return { error: error.message };

    const row = data as any;
    const changed = Object.keys(patch).filter((k) => k !== "updated_at");
    const beforeSubset: Record<string, unknown> = {};
    for (const k of changed) beforeSubset[k] = before[k];

    ctx.actions.push({ action: "update", product_id: row.id, name: row.name, changed });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "update",
      target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: beforeSubset, after_value: patch,
    });
    return { ok: true, product: row };
  },
};

const setActive: AgentTool = {
  name: "set_active",
  description: "Activa o desactiva (publica/despublica) un producto.",
  risk: "write",
  parameters: {
    type: "object",
    properties: { id: { type: "string" }, is_active: { type: "boolean" } },
    required: ["id", "is_active"],
  },
  async run(args, ctx) {
    if (!args?.id || typeof args?.is_active !== "boolean") {
      return { error: "Indica id e is_active (boolean)." };
    }
    const before = await getProductRow(ctx, args.id, "id, name, is_active");
    if (!before) return { error: "Producto no encontrado." };

    const { data, error } = await ctx.supabase.from(TABLE)
      .update({ is_active: args.is_active, updated_at: new Date().toISOString() })
      .eq("id", args.id).select(PRODUCT_SELECT).single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({
      action: "set_active", product_id: row.id, name: row.name, is_active: args.is_active,
    });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "set_active",
      target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: { is_active: before.is_active }, after_value: { is_active: args.is_active },
    });
    return { ok: true, product: row };
  },
};

const setMainImage: AgentTool = {
  name: "set_main_image",
  description:
    "Asigna la imagen principal (main_image) de un producto. Si el usuario adjuntó una imagen en el chat, deja image_url vacío y se usará la adjunta.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "UUID del producto." },
      image_url: {
        type: "string",
        description: "URL de la imagen. Opcional si hay imagen adjunta en el chat.",
      },
    },
    required: ["id"],
  },
  async run(args, ctx) {
    if (!args?.id) return { error: "Indica id." };
    const url = args.image_url || ctx.attachedImageUrl;
    if (!url) return { error: "No hay image_url ni imagen adjunta en el chat." };

    const before = await getProductRow(ctx, args.id, "id, name, main_image");
    if (!before) return { error: "Producto no encontrado." };

    const { data, error } = await ctx.supabase.from(TABLE)
      .update({ main_image: url, updated_at: new Date().toISOString() })
      .eq("id", args.id).select(`${PRODUCT_SELECT}, main_image`).single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({
      action: "set_main_image", product_id: row.id, name: row.name, image_url: url,
    });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: { id: args.id }, action: "update",
      target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: { main_image: before.main_image }, after_value: { main_image: url },
    });
    return { ok: true, product: row };
  },
};

const addGalleryImages: AgentTool = {
  name: "add_gallery_images",
  description:
    "Agrega una o más imágenes a la galería (gallery_images) de un producto. Si el usuario adjuntó una imagen y no pasas urls, se agrega la adjunta.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      image_urls: {
        type: "array",
        items: { type: "string" },
        description: "URLs a agregar. Opcional si hay imagen adjunta.",
      },
    },
    required: ["id"],
  },
  async run(args, ctx) {
    if (!args?.id) return { error: "Indica id." };
    let urls: string[] = Array.isArray(args.image_urls)
      ? args.image_urls.filter((u: unknown): u is string => typeof u === "string")
      : [];
    if (urls.length === 0 && ctx.attachedImageUrl) urls = [ctx.attachedImageUrl];
    if (urls.length === 0) return { error: "No hay urls ni imagen adjunta para agregar." };

    const before = await getProductRow(ctx, args.id, "id, name, gallery_images");
    if (!before) return { error: "Producto no encontrado." };

    const current = normalizeGallery(before.gallery_images);
    const next = [...current, ...urls.filter((u) => !current.includes(u))];

    const { data, error } = await ctx.supabase.from(TABLE)
      .update({ gallery_images: next, updated_at: new Date().toISOString() })
      .eq("id", args.id).select("id, name, gallery_images").single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({
      action: "add_gallery", product_id: row.id, name: row.name, added: urls.length,
    });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: { id: args.id, count: urls.length },
      action: "update", target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: { gallery_images: current }, after_value: { gallery_images: next },
    });
    return { ok: true, product: row, gallery_count: next.length };
  },
};

const removeGalleryImage: AgentTool = {
  name: "remove_gallery_image",
  description: "Quita una imagen de la galería de un producto por su URL exacta.",
  risk: "write",
  parameters: {
    type: "object",
    properties: { id: { type: "string" }, image_url: { type: "string" } },
    required: ["id", "image_url"],
  },
  async run(args, ctx) {
    if (!args?.id || !args?.image_url) return { error: "Indica id e image_url." };

    const before = await getProductRow(ctx, args.id, "id, name, gallery_images");
    if (!before) return { error: "Producto no encontrado." };

    const current = normalizeGallery(before.gallery_images);
    const next = current.filter((u) => u !== args.image_url);
    if (next.length === current.length) return { error: "Esa URL no estaba en la galería." };

    const { data, error } = await ctx.supabase.from(TABLE)
      .update({ gallery_images: next, updated_at: new Date().toISOString() })
      .eq("id", args.id).select("id, name, gallery_images").single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({ action: "remove_gallery", product_id: row.id, name: row.name });
    await ctx.audit({
      role: "tool", tool_name: this.name, tool_args: args, action: "update",
      target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: { gallery_images: current }, after_value: { gallery_images: next },
    });
    return { ok: true, product: row, gallery_count: next.length };
  },
};

const enhanceMainImage: AgentTool = {
  name: "enhance_main_image",
  description:
    "Mejora con IA la imagen principal del producto (recorte/encuadre, iluminación y fondo de catálogo). No genera una imagen desde cero: parte de la foto actual del producto (o la adjunta).",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      background: {
        type: "string",
        enum: ["white_ecommerce", "transparent", "premium_jar", "premium_box"],
        description: "Estilo de fondo. Por defecto white_ecommerce (fondo blanco para ecommerce).",
      },
      extra_instructions: {
        type: "string",
        description: "Instrucciones extra opcionales para el retoque.",
      },
    },
    required: ["id"],
  },
  async run(args, ctx) {
    if (!args?.id) return { error: "Indica id." };

    const prod = await getProductRow(ctx, args.id, "id, name, main_image");
    if (!prod) return { error: "Producto no encontrado." };

    const sourceImage = ctx.attachedImageUrl || prod.main_image;
    if (!sourceImage) {
      return { error: "El producto no tiene imagen principal y no hay imagen adjunta para mejorar." };
    }

    const hasLovable = !!Deno.env.get("LOVABLE_API_KEY");
    const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    if (!hasLovable && !hasOpenAI) {
      return { error: "Falta LOVABLE_API_KEY u OPENAI_API_KEY para editar imágenes." };
    }
    const provider = hasLovable ? "lovable" : "openai";
    const fallback = hasLovable && hasOpenAI ? "openai" : undefined;

    const r = await fetch(`${ctx.supabaseUrl}/functions/v1/product-image-edit`, {
      method: "POST",
      headers: {
        Authorization: ctx.authHeader,
        apikey: ctx.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: sourceImage,
        background: args.background || "white_ecommerce",
        extra_instructions: args.extra_instructions || "",
        provider,
        fallback,
      }),
    });
    const edit = await r.json().catch(() => ({}));
    if (!r.ok || !edit?.success || !edit?.image) {
      return { error: `No se pudo mejorar la imagen: ${edit?.error || `HTTP ${r.status}`}` };
    }

    let publicUrl: string;
    try {
      publicUrl = await uploadDataUrl(ctx.service, edit.image);
    } catch (e: any) {
      return { error: `Imagen generada pero no se pudo guardar: ${e?.message ?? e}` };
    }

    const { data, error } = await ctx.supabase.from(TABLE)
      .update({ main_image: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", args.id).select(`${PRODUCT_SELECT}, main_image`).single();
    if (error) return { error: error.message };

    const row = data as any;
    ctx.actions.push({
      action: "enhance_main_image", product_id: row.id, name: row.name,
      image_url: publicUrl, background: args.background || "white_ecommerce",
    });
    await ctx.audit({
      role: "tool", tool_name: this.name,
      tool_args: { id: args.id, background: args.background }, action: "update",
      target_table: TABLE, target_id: row.id, product_id: row.id,
      before_value: { main_image: prod.main_image }, after_value: { main_image: publicUrl },
    });
    return { ok: true, product: row, image_url: publicUrl };
  },
};

export const catalogDomain: AgentDomain = {
  key: "catalogo",
  title: "Catálogo",
  description:
    "Productos del catálogo: buscar, ver el detalle, crear, editar (precio, oferta, stock, descripción, categoría), activar o desactivar, y gestionar imágenes (principal, galería, mejora con IA). Úsalo para cualquier consulta o cambio sobre productos.",
  system: `Eres el especialista de catálogo de Nutribatidos (tienda peruana de suplementos).

Reglas:
- Antes de crear o editar, asegúrate de tener los datos necesarios; si falta algo importante, pregunta.
- Para editar, asignar imagen o activar/desactivar un producto necesitas su id; si el usuario lo nombra, primero búscalo con search_products.
- Si el contexto indica IMAGEN_ADJUNTA, úsala dejando image_url vacío: la herramienta la toma automáticamente.
- Moneda en Soles (S/). Los precios son números (ej. 79.90).
- Nunca inventes ids, productos ni URLs de imagen: usa solo lo que devuelven las herramientas o la imagen adjunta.
- Sin afirmaciones médicas. Evita prometer curaciones.
- Al terminar, informa en una o dos frases qué hiciste, nombrando el producto y el cambio.`,
  tools: [
    searchProducts,
    getProduct,
    createProduct,
    updateProduct,
    setActive,
    setMainImage,
    addGalleryImages,
    removeGalleryImage,
    enhanceMainImage,
  ],
};
