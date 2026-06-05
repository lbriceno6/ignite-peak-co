// Rewrites an imported product into Nutribatidos brand voice with Lovable AI.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Eres copywriter de Nutribatidos (marca peruana de batidos y suplementos saludables).
Reglas estrictas:
- NO copies textos literalmente de la fuente. Reescribe.
- NO hagas afirmaciones médicas, NO prometas curaciones.
- NO inventes ingredientes, certificaciones, premios ni origen.
- Mantén tono comercial, claro, cercano, natural en español.
- Adapta el contenido a la marca Nutribatidos.
Devuelve SOLO JSON válido con las claves: title, short_description, long_description, benefits[], meta_title, meta_description, keywords[], category_suggestion, intent_suggestion, ingredients[].`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { imported_product_id } = await req.json();
    if (!imported_product_id) return new Response(JSON.stringify({ error: "imported_product_id requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ip, error } = await supabase.from("imported_products").select("*").eq("id", imported_product_id).single();
    if (error || !ip) return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userPrompt = `Producto original detectado:\n- Título: ${ip.original_title || "(sin título)"}\n- Marca: ${ip.detected_brand || "-"}\n- Categoría detectada: ${ip.detected_category || "-"}\n- Descripción: ${ip.original_description || "-"}\n- Precio: ${ip.original_price || "-"} ${ip.original_currency || ""}\nReescribe para Nutribatidos. Sugiere categoría e intención (energia, fitness, colageno, articulaciones, belleza, bienestar, masa_muscular).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Límite de IA alcanzado, intenta en unos segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) return new Response(JSON.stringify({ error: `IA error ${res.status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const updates = {
      ai_rewritten_title: (parsed.title as string) || null,
      ai_rewritten_description: (parsed.short_description as string) || null,
      ai_long_description: (parsed.long_description as string) || null,
      ai_benefits: parsed.benefits || [],
      ai_meta_title: (parsed.meta_title as string) || null,
      ai_meta_description: (parsed.meta_description as string) || null,
      ai_keywords: parsed.keywords || [],
      ai_category_suggestion: (parsed.category_suggestion as string) || null,
      ai_intent_suggestion: (parsed.intent_suggestion as string) || null,
      ai_ingredients: parsed.ingredients || [],
    };

    await supabase.from("imported_products").update(updates).eq("id", imported_product_id);
    return new Response(JSON.stringify({ ok: true, ...updates }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
