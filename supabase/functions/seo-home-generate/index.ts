// SEO Home — AI generator. Suggests title/desc/og/twitter/schema/llms.
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

const SYSTEM = `Eres experto SEO para Nutribatidos (ecommerce de batidos y suplementos naturales en español).
NUNCA uses claims médicos sensibles: nada de "cura", "elimina enfermedades", "trata diabetes/artrosis/osteoporosis", "sana órganos", "reemplaza medicamentos".
USA frases seguras: "ayuda a complementar la alimentación", "contribuye al bienestar general", "puede apoyar una rutina saludable", "productos alimenticios naturales", "ideal para una alimentación balanceada".
Devuelve SOLO JSON via tool call.`;

const TOOL = {
  type: "function",
  function: {
    name: "submit_home_seo",
    description: "Sugerencias SEO para la Home",
    parameters: {
      type: "object",
      properties: {
        title_options: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
        description_options: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
        h1: { type: "string" },
        intro_text: { type: "string" },
        og_title: { type: "string" },
        og_description: { type: "string" },
        twitter_title: { type: "string" },
        twitter_description: { type: "string" },
        llms_summary: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        schema_website: { type: "object", additionalProperties: true },
        schema_organization: { type: "object", additionalProperties: true },
      },
      required: ["title_options", "description_options", "h1", "intro_text", "og_title", "og_description", "twitter_title", "twitter_description", "llms_summary", "keywords", "schema_website", "schema_organization"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Acceso denegado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const extra = (body.extra_context as string) || "";

    // Pull context: top categories + featured products
    const [{ data: cats }, { data: products }, { data: settings }] = await Promise.all([
      admin.from("categories").select("name").limit(12),
      admin.from("products").select("name,short_description,goal,main_ingredient").eq("is_active", true).eq("approval_status", "approved").order("sort_order").limit(10),
      admin.from("seo_settings" as any).select("*").eq("id", 1).maybeSingle(),
    ]);

    const userPrompt = `Marca: ${(settings as any)?.site_name || "Nutribatidos"}
Categorías: ${(cats ?? []).map((c: any) => c.name).join(", ")}
Productos destacados: ${(products ?? []).map((p: any) => `${p.name} (${p.goal ?? ""} / ${p.main_ingredient ?? ""})`).join("; ")}
Propuesta de valor: batidos y suplementos naturales que apoyan una alimentación balanceada.
Público objetivo: adultos que buscan bienestar y energía con productos naturales.
Estilo: cercano, claro, motivador, sin claims médicos.
${extra ? `Contexto adicional: ${extra}` : ""}

Genera 5 títulos (50-60 chars), 5 descripciones (140-160 chars), H1, intro (60-120 palabras), OG/Twitter, llms_summary (2-3 frases), keywords (8-12), schema_website y schema_organization (JSON-LD válidos), y recomendaciones SEO.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_home_seo" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Límite de uso de IA alcanzado." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Sin créditos de IA." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `IA ${aiRes.status}: ${txt.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiRes.json();
    const tc = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA no devolvió tool call" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify({ suggestion: parsed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
