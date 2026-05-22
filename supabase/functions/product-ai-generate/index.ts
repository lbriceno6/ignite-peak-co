// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const LEVEL_GUIDE: Record<string, string> = {
  basico: "Texto claro y directo, conciso, sin adornos. Máx 2-3 frases por bloque.",
  equilibrado: "Texto profesional con un toque comercial moderado. Frases naturales.",
  vendedor: "Texto muy vendedor, emocional, con beneficios claros, llamados a la acción suaves.",
  premium: "Texto premium, sofisticado, con storytelling breve, beneficios percibidos altos, lenguaje aspiracional.",
};

function buildSystemPrompt(level: string) {
  const guide = LEVEL_GUIDE[level] ?? LEVEL_GUIDE.equilibrado;
  return `Eres un copywriter experto en ecommerce de productos naturales, suplementos y nutribatidos para la marca Nutribatidos.

Nivel de contenido solicitado: ${level.toUpperCase()}.
Guía de tono: ${guide}

REGLAS OBLIGATORIAS:
- Escribe siempre en español neutro.
- NO hagas promesas médicas: nada de "cura", "elimina enfermedades", "trata", "sana", "reemplaza medicamentos", "garantiza resultados".
- Usa lenguaje enfocado en: bienestar, energía, nutrición, recuperación, vitalidad, alimentación saludable, apoyo a un estilo de vida activo.
- Sé claro, profesional y confiable.
- Para "size_variants" usa el formato "etiqueta|precio" una por línea (ej: 500g|29.90).
- "nutrition_facts" debe ser un objeto JSON simple (claves: proteina, carbohidratos, grasas, fibra, calorias, etc.).
- "faqs" debe ser un arreglo de objetos {q, a}.
- "slug" debe ser url-safe (a-z, 0-9, guiones).
- No incluyas campos que no conozcas con seguridad — déjalos vacíos o con un valor razonable.`;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "fill_product",
    description: "Devuelve los campos sugeridos para un producto de Nutribatidos.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        slug: { type: "string" },
        short_description: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        badge: { type: "string", enum: ["", "new", "best-seller", "sale", "limited", "popular", "exclusive"] },
        main_ingredient: { type: "string" },
        goal: { type: "string" },
        flavor: { type: "string" },
        size: { type: "string" },
        size_variants: { type: "string", description: "Una línea por variante con formato etiqueta|precio" },
        usage_instructions: { type: "string" },
        ingredients: { type: "string" },
        nutrition_facts: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        faqs: {
          type: "array",
          items: {
            type: "object",
            properties: { q: { type: "string" }, a: { type: "string" } },
            required: ["q", "a"],
            additionalProperties: false,
          },
        },
        commercial_pitch: { type: "string", description: "Texto comercial extra para vender mejor (opcional)." },
        seo_title: { type: "string" },
        seo_description: { type: "string" },
      },
      required: ["short_description", "description"],
      additionalProperties: false,
    },
  },
};

// Map provider → gateway model (Lovable AI Gateway only supports Gemini and OpenAI;
// Claude/DeepSeek require user-provided API keys and are called directly).
const GATEWAY_MODEL: Record<string, string> = {
  gemini: "google/gemini-2.5-pro",
  openai: "openai/gpt-5-mini",
};

async function callLovableGateway(model: string, system: string, user: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no está configurada en el servidor.");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "fill_product" } },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    if (r.status === 429) throw new Error("Límite de uso de IA alcanzado. Intenta más tarde.");
    if (r.status === 402) throw new Error("Sin créditos en Lovable AI. Recarga tu workspace.");
    throw new Error(`Lovable AI ${r.status}: ${t}`);
  }
  const j = await r.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("La IA no devolvió datos estructurados.");
  return JSON.parse(call.function.arguments);
}

async function callDeepSeek(apiKey: string, system: string, user: string) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system + "\n\nResponde ÚNICAMENTE con un JSON válido que cumpla el esquema, sin texto adicional ni markdown." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(txt);
}

async function callClaude(apiKey: string, system: string, user: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2000,
      system: system + "\n\nResponde ÚNICAMENTE con un JSON válido siguiendo el esquema fill_product, sin texto adicional ni markdown.",
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const txt = j.content?.[0]?.text ?? "{}";
  const match = txt.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : "{}");
}

async function callOpenAIDirect(apiKey: string, system: string, user: string) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "fill_product" } },
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("OpenAI no devolvió datos estructurados.");
  return JSON.parse(call.function.arguments);
}

async function callGeminiDirect(apiKey: string, system: string, user: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system + "\n\nResponde ÚNICAMENTE con JSON válido, sin markdown." }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(txt);
}

function buildUserPrompt(mode: string, product: any) {
  const known = Object.entries(product)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v).slice(0, 400)}`)
    .join("\n");
  const action = mode === "improve"
    ? "Mejora y reescribe los campos del siguiente producto para que sea más vendedor, profesional y completo. Mantén consistencia con los datos existentes."
    : "Completa los campos vacíos y mejora los campos existentes del siguiente producto.";
  return `${action}

Datos actuales del producto:
${known || "(sin datos aún)"}

Devuelve el resultado llamando a la función fill_product con los campos sugeridos.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AuthN/Z: only admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const provider = (body.provider ?? "gemini") as string;
    const level = (body.level ?? "equilibrado") as string;
    const mode = (body.mode ?? "fill") as string;
    const product = body.product ?? {};

    const { data: settings } = await admin.from("ai_product_settings").select("*").eq("id", 1).maybeSingle();

    const system = buildSystemPrompt(level);
    const userPrompt = buildUserPrompt(mode, product);

    let result: any;
    if (provider === "deepseek") {
      const key = settings?.deepseek_api_key || Deno.env.get("DEEPSEEK_API_KEY");
      if (!key) throw new Error("Configura tu API Key de DeepSeek para usar el asistente IA.");
      result = await callDeepSeek(key, system, userPrompt);
    } else if (provider === "claude") {
      const key = settings?.claude_api_key;
      if (!key) throw new Error("Configura tu API Key de Claude para usar el asistente IA.");
      result = await callClaude(key, system, userPrompt);
    } else if (provider === "openai") {
      const key = settings?.openai_api_key;
      if (key) result = await callOpenAIDirect(key, system, userPrompt);
      else result = await callLovableGateway(GATEWAY_MODEL.openai, system, userPrompt);
    } else {
      const key = settings?.gemini_api_key;
      if (key) result = await callGeminiDirect(key, system, userPrompt);
      else result = await callLovableGateway(GATEWAY_MODEL.gemini, system, userPrompt);
    }

    return new Response(JSON.stringify({ suggestions: result, provider, level }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-ai-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
