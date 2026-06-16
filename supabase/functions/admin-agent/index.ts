// Edge function: admin-agent — Agente IA para gestionar el catálogo (solo admin).
//
// Chat con tool-calling: el modelo puede buscar productos, ver el detalle y
// crear / editar / activar-desactivar productos. Cada acción respeta RLS (se
// usa el token del admin) y queda registrada en `admin_agent_log`.
//
// Proveedor por defecto: OpenAI (OPENAI_API_KEY). También admite DeepSeek
// (DEEPSEEK_API_KEY) y el gateway de Lovable (LOVABLE_API_KEY) como respaldo,
// todos compatibles con la API de chat-completions con tools.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Eres el Agente de Catálogo de Nutribatidos (tienda peruana de suplementos).
Ayudas al administrador a gestionar el catálogo de productos conversando en español.

Puedes usar herramientas para:
- Buscar productos (search_products) y ver su detalle (get_product).
- Crear productos (create_product).
- Editar campos de un producto (update_product): precio, oferta, stock, descripción, etc.
- Activar o desactivar un producto (set_active).

Reglas:
- SIEMPRE responde en español, claro y conciso.
- Antes de crear o editar, asegúrate de tener los datos necesarios; si falta algo importante, pregunta.
- Para editar o activar/desactivar un producto necesitas su id; si el usuario lo nombra, primero búscalo con search_products.
- Moneda en Soles (S/). Los precios son números (ej. 79.90).
- Nunca inventes ids ni productos: usa solo lo que devuelven las herramientas.
- Sin afirmaciones médicas. Evita prometer curaciones.
- Tras ejecutar una acción, confirma en lenguaje natural qué hiciste (nombre del producto y el cambio).`;

// Campos editables permitidos sobre la tabla products.
const EDITABLE_FIELDS = [
  "name", "slug", "short_description", "description", "price", "sale_price",
  "category", "subcategory", "main_ingredient", "goal", "flavor", "size",
  "stock", "is_active", "badge", "usage_instructions", "ingredients",
];

const PRODUCT_SELECT =
  "id, name, slug, short_description, price, sale_price, category, subcategory, stock, is_active, badge, flavor, size, goal, main_ingredient";

type Provider = "openai" | "deepseek" | "lovable";

function pickProvider(requested?: string): Provider | null {
  const has = (k: string) => !!Deno.env.get(k);
  const order: Provider[] = ["openai", "deepseek", "lovable"];
  if (requested && order.includes(requested as Provider)) {
    order.unshift(requested as Provider);
  }
  for (const p of order) {
    if (p === "openai" && has("OPENAI_API_KEY")) return "openai";
    if (p === "deepseek" && has("DEEPSEEK_API_KEY")) return "deepseek";
    if (p === "lovable" && has("LOVABLE_API_KEY")) return "lovable";
  }
  return null;
}

function providerEndpoint(p: Provider): { url: string; headers: Record<string, string>; model: string } {
  if (p === "deepseek") {
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}` },
      model: "deepseek-chat",
    };
  }
  if (p === "lovable") {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! },
      model: "openai/gpt-4o-mini",
    };
  }
  return {
    url: "https://api.openai.com/v1/chat/completions",
    headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
    model: "gpt-4o-mini",
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Busca productos del catálogo por texto (nombre), categoría y/o estado. Devuelve una lista resumida.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto a buscar en el nombre del producto." },
          category: { type: "string", description: "Filtrar por categoría exacta." },
          status: { type: "string", enum: ["active", "inactive", "all"], description: "Filtrar por estado. Por defecto all." },
          limit: { type: "integer", description: "Máximo de resultados (1-25). Por defecto 10." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description: "Obtiene el detalle de un producto por id o por slug.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "UUID del producto." },
          slug: { type: "string", description: "Slug del producto." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Crea un nuevo producto en el catálogo. Requiere al menos nombre y precio.",
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
          is_active: { type: "boolean", description: "Por defecto false (borrador) hasta que el admin confirme." },
          slug: { type: "string", description: "Opcional; si no se da, se genera del nombre." },
        },
        required: ["name", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Actualiza campos de un producto existente. Indica el id y solo los campos a cambiar.",
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
    },
  },
  {
    type: "function",
    function: {
      name: "set_active",
      description: "Activa o desactiva (publica/despublica) un producto.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          is_active: { type: "boolean" },
        },
        required: ["id", "is_active"],
      },
    },
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

type ToolContext = {
  supabase: SupabaseClient;
  actions: any[]; // acciones efectivas (mutaciones) para devolver al cliente
  audit: (entry: Record<string, unknown>) => Promise<void>;
};

async function runTool(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  const { supabase } = ctx;

  if (name === "search_products") {
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 25);
    let q = supabase.from("products").select(PRODUCT_SELECT).order("updated_at", { ascending: false }).limit(limit);
    if (args?.query) q = q.ilike("name", `%${args.query}%`);
    if (args?.category) q = q.eq("category", args.category);
    if (args?.status === "active") q = q.eq("is_active", true);
    if (args?.status === "inactive") q = q.eq("is_active", false);
    const { data, error } = await q;
    if (error) return { error: error.message };
    await ctx.audit({ role: "tool", tool_name: name, tool_args: args, action: "search", tool_result: { count: data?.length ?? 0 } });
    return { count: data?.length ?? 0, products: data ?? [] };
  }

  if (name === "get_product") {
    if (!args?.id && !args?.slug) return { error: "Indica id o slug." };
    let q = supabase.from("products").select("*").limit(1);
    q = args?.id ? q.eq("id", args.id) : q.eq("slug", args.slug);
    const { data, error } = await q.maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Producto no encontrado." };
    await ctx.audit({ role: "tool", tool_name: name, tool_args: args, action: "get", product_id: data.id });
    return { product: data };
  }

  if (name === "create_product") {
    if (!args?.name || args?.price == null) return { error: "Se requieren al menos name y price." };
    const payload: Record<string, unknown> = {
      name: args.name,
      slug: args.slug ? slugify(args.slug) : slugify(args.name),
      price: Number(args.price),
      is_active: args.is_active ?? false,
    };
    for (const f of ["sale_price", "short_description", "description", "category", "stock"]) {
      if (args[f] != null) payload[f] = f === "sale_price" ? Number(args[f]) : f === "stock" ? Math.trunc(Number(args[f])) : args[f];
    }
    const { data, error } = await supabase.from("products").insert(payload).select(PRODUCT_SELECT).single();
    if (error) return { error: error.message };
    ctx.actions.push({ action: "create", product_id: data.id, name: data.name, after: data });
    await ctx.audit({ role: "tool", tool_name: name, tool_args: args, action: "create", product_id: data.id, after_value: data });
    return { ok: true, product: data };
  }

  if (name === "update_product") {
    if (!args?.id || !args?.fields || typeof args.fields !== "object") return { error: "Indica id y fields." };
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args.fields)) {
      if (!EDITABLE_FIELDS.includes(k)) continue;
      if (k === "price" || k === "sale_price") patch[k] = v == null ? null : Number(v);
      else if (k === "stock") patch[k] = Math.trunc(Number(v));
      else if (k === "slug") patch[k] = slugify(String(v));
      else patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return { error: "Ningún campo editable válido en fields." };
    const { data: before } = await supabase.from("products").select("*").eq("id", args.id).maybeSingle();
    if (!before) return { error: "Producto no encontrado." };
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("products").update(patch).eq("id", args.id).select(PRODUCT_SELECT).single();
    if (error) return { error: error.message };
    const beforeSubset: Record<string, unknown> = {};
    for (const k of Object.keys(patch)) if (k !== "updated_at") beforeSubset[k] = (before as any)[k];
    ctx.actions.push({ action: "update", product_id: data.id, name: data.name, changed: Object.keys(patch).filter((k) => k !== "updated_at") });
    await ctx.audit({ role: "tool", tool_name: name, tool_args: args, action: "update", product_id: data.id, before_value: beforeSubset, after_value: patch });
    return { ok: true, product: data };
  }

  if (name === "set_active") {
    if (!args?.id || typeof args?.is_active !== "boolean") return { error: "Indica id e is_active (boolean)." };
    const { data: before } = await supabase.from("products").select("id, name, is_active").eq("id", args.id).maybeSingle();
    if (!before) return { error: "Producto no encontrado." };
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: args.is_active, updated_at: new Date().toISOString() })
      .eq("id", args.id)
      .select(PRODUCT_SELECT)
      .single();
    if (error) return { error: error.message };
    ctx.actions.push({ action: "set_active", product_id: data.id, name: data.name, is_active: args.is_active });
    await ctx.audit({
      role: "tool", tool_name: name, tool_args: args, action: "set_active", product_id: data.id,
      before_value: { is_active: (before as any).is_active }, after_value: { is_active: args.is_active },
    });
    return { ok: true, product: data };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "no auth" }, 401);

    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { message, history, session_id, provider: reqProvider } = body || {};
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);

    const provider = pickProvider(reqProvider);
    if (!provider) {
      return json({
        error: "No hay clave de IA configurada. Agrega OPENAI_API_KEY (o DEEPSEEK_API_KEY / LOVABLE_API_KEY) en los secretos de Supabase.",
      }, 400);
    }
    const ep = providerEndpoint(provider);
    const userId = userData.user.id;

    const audit = async (entry: Record<string, unknown>) => {
      try {
        await supabase.from("admin_agent_log").insert({ user_id: userId, session_id: session_id ?? null, provider, model: ep.model, ...entry });
      } catch (_) { /* el log no debe romper la conversación */ }
    };

    // Construye el historial de mensajes para el modelo.
    const messages: any[] = [{ role: "system", content: SYSTEM }];
    const recent = Array.isArray(history) ? history.slice(-12) : [];
    for (const m of recent) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        messages.push({ role: m.role, content: m.content });
      }
    }
    messages.push({ role: "user", content: message });
    await audit({ role: "user", content: message });

    const actions: any[] = [];
    const ctx: ToolContext = { supabase, actions, audit };

    let tokensIn = 0;
    let tokensOut = 0;
    const start = Date.now();
    let finalText = "";

    // Bucle de tool-calling (máx. 6 rondas para acotar coste/latencia).
    for (let round = 0; round < 6; round++) {
      const r = await fetch(ep.url, {
        method: "POST",
        headers: { ...ep.headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ep.model,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error(`[admin-agent] ${provider} ${r.status}: ${errText.slice(0, 300)}`);
        const msg = r.status === 401 || r.status === 403
          ? `Credenciales inválidas para ${provider}.`
          : r.status === 429
            ? `Rate limit de ${provider}. Intenta en unos segundos.`
            : `El proveedor ${provider} respondió ${r.status}.`;
        return json({ error: msg, provider }, 502);
      }
      const j = await r.json();
      tokensIn += j.usage?.prompt_tokens ?? 0;
      tokensOut += j.usage?.completion_tokens ?? 0;
      const choice = j.choices?.[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        finalText = choice.content ?? "";
        messages.push({ role: "assistant", content: finalText });
        break;
      }

      // El modelo pidió ejecutar herramientas.
      messages.push({ role: "assistant", content: choice.content ?? "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        let parsedArgs: any = {};
        try { parsedArgs = JSON.parse(tc.function?.arguments || "{}"); } catch { parsedArgs = {}; }
        let result: unknown;
        try {
          result = await runTool(tc.function?.name, parsedArgs, ctx);
        } catch (e: any) {
          result = { error: String(e?.message || e) };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    if (!finalText) {
      finalText = actions.length
        ? "Listo, apliqué los cambios solicitados."
        : "No pude completar la solicitud. ¿Puedes darme más detalles?";
    }

    const latency_ms = Date.now() - start;
    await audit({ role: "assistant", content: finalText, tokens_in: tokensIn, tokens_out: tokensOut, latency_ms });

    return json({
      reply: finalText,
      actions,
      provider,
      model: ep.model,
      tokens: { input: tokensIn, output: tokensOut },
      latency_ms,
    });
  } catch (e: any) {
    console.error("[admin-agent] fatal:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
