// SEO Suggestion Generator — Etapa 2
// Uses Lovable AI Gateway to generate SEO fields for products, blog posts and categories.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type EntityType = "product" | "blog" | "category";

const SYSTEM_PROMPT = `Eres un experto en SEO para ecommerce en español (Nutribatidos, suplementos y batidos nutricionales).
Optimizas para Google, Google Shopping, buscadores con IA (ChatGPT, Perplexity) y el buscador interno.
Reglas duras:
- Título SEO: 50-60 caracteres, incluye keyword principal al inicio.
- Meta descripción: 140-160 caracteres, persuasiva, con CTA suave.
- Slug: kebab-case, sin stopwords, máx 60 chars, ASCII.
- Keywords: 5-8 términos en español, mezcla short y long-tail.
- Tags: 3-6 etiquetas cortas para clasificación interna.
- Shopping title: hasta 150 chars, formato "Marca + Producto + Atributos clave".
- FAQs: 3-5 preguntas reales que harían los clientes, con respuestas concisas (max 280 chars).
- Alt text: descriptivo, 80-125 chars, sin "imagen de".
Devuelve SOLO JSON válido, sin texto antes ni después, ajustado al schema.`;

function buildUserPrompt(entityType: EntityType, entity: any, images: string[]): string {
  if (entityType === "product") {
    return `Genera SEO para este PRODUCTO:
Nombre: ${entity.name}
Categoría: ${entity.category ?? "—"}
Objetivo: ${entity.goal ?? "—"}
Ingrediente principal: ${entity.main_ingredient ?? "—"}
Sabor: ${entity.flavor ?? "—"}
Tamaño: ${entity.size ?? "—"}
Precio: ${entity.price}
Descripción corta actual: ${entity.short_description ?? "—"}
Descripción larga actual: ${entity.description ?? "—"}
Imágenes: ${images.length} (${images.slice(0, 5).join(", ")})

Para alt_texts devuelve un objeto por imagen con {image_url, alt_text}.`;
  }
  if (entityType === "blog") {
    return `Genera SEO para este POST DE BLOG:
Título: ${entity.title}
Categoría: ${entity.category ?? "—"}
Extracto: ${entity.excerpt ?? "—"}
Contenido (primeros 1500 chars): ${(entity.content ?? "").slice(0, 1500)}
Imagen portada: ${entity.cover_image ?? "—"}`;
  }
  return `Genera SEO para esta CATEGORÍA:
Nombre: ${entity.name}
Tipo: ${entity.type ?? "—"}
Descripción: ${entity.description ?? "—"}`;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_seo_suggestion",
    description: "Devuelve la sugerencia SEO completa.",
    parameters: {
      type: "object",
      properties: {
        seo_title: { type: "string" },
        seo_description: { type: "string" },
        slug: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        short_description: { type: "string" },
        long_description: { type: "string" },
        shopping_title: { type: "string" },
        shopping_description: { type: "string" },
        faqs: {
          type: "array",
          items: {
            type: "object",
            properties: { question: { type: "string" }, answer: { type: "string" } },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
        image_alts: {
          type: "array",
          items: {
            type: "object",
            properties: { image_url: { type: "string" }, alt_text: { type: "string" } },
            required: ["image_url", "alt_text"],
            additionalProperties: false,
          },
        },
      },
      required: ["seo_title", "seo_description", "slug", "keywords", "tags", "faqs"],
      additionalProperties: false,
    },
  },
};

async function fetchEntity(admin: any, entityType: EntityType, entityId: string) {
  if (entityType === "product") {
    const { data } = await admin.from("products").select("*").eq("id", entityId).maybeSingle();
    return data;
  }
  if (entityType === "blog") {
    const { data } = await admin.from("blog_posts").select("*").eq("id", entityId).maybeSingle();
    return data;
  }
  const { data } = await admin.from("categories").select("*").eq("id", entityId).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Acceso denegado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const entityType = body.entity_type as EntityType;
    const entityId = body.entity_id as string;
    const model = (body.model as string) || "google/gemini-3-flash-preview";

    if (!["product", "blog", "category"].includes(entityType) || !entityId) {
      return new Response(JSON.stringify({ error: "entity_type/entity_id inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const entity = await fetchEntity(admin, entityType, entityId);
    if (!entity) return new Response(JSON.stringify({ error: "Entidad no encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const images: string[] = entityType === "product"
      ? [entity.main_image, ...((entity.gallery_images as string[]) ?? [])].filter(Boolean)
      : entityType === "blog" && entity.cover_image ? [entity.cover_image] : [];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(entityType, entity, images) },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_seo_suggestion" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Límite de uso de IA alcanzado, intenta de nuevo en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Sin créditos de IA. Agrega créditos al workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `IA error ${aiRes.status}: ${txt.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA no devolvió tool call" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    // Persist suggestion as pending
    const { data: inserted, error: insErr } = await admin
      .from("seo_suggestions")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        status: "pending",
        model,
        seo_title: parsed.seo_title ?? null,
        seo_description: parsed.seo_description ?? null,
        slug: parsed.slug ?? null,
        keywords: parsed.keywords ?? [],
        tags: parsed.tags ?? [],
        short_description: parsed.short_description ?? null,
        long_description: parsed.long_description ?? null,
        shopping_title: parsed.shopping_title ?? null,
        shopping_description: parsed.shopping_description ?? null,
        faqs: parsed.faqs ?? [],
        image_alts: parsed.image_alts ?? [],
        raw: parsed,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ suggestion: inserted }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
