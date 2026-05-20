// Generates a monthly SEO plan via Lovable AI Gateway and stores items as drafts in seo_content_plan.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = {
  type: "object",
  properties: {
    blog_posts: { type: "array", items: { type: "object", properties: { title: { type: "string" }, target_keyword: { type: "string" }, notes: { type: "string" } }, required: ["title"] }, minItems: 4, maxItems: 4 },
    landings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, target_keyword: { type: "string" }, notes: { type: "string" } }, required: ["title"] }, minItems: 5, maxItems: 5 },
    faqs: { type: "array", items: { type: "object", properties: { title: { type: "string" }, notes: { type: "string" } }, required: ["title"] }, minItems: 10, maxItems: 10 },
    keywords: { type: "array", items: { type: "string" }, minItems: 20, maxItems: 20 },
    synonyms: { type: "array", items: { type: "string" }, minItems: 20, maxItems: 20 },
    product_improvements: { type: "array", items: { type: "object", properties: { title: { type: "string" }, notes: { type: "string" } }, required: ["title"] }, minItems: 10, maxItems: 10 },
    internal_links: { type: "array", items: { type: "object", properties: { title: { type: "string" }, target_url: { type: "string" }, notes: { type: "string" } }, required: ["title"] }, minItems: 10, maxItems: 10 },
  },
  required: ["blog_posts", "landings", "faqs", "keywords", "synonyms", "product_improvements", "internal_links"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Context: zero-result searches + landings + low-score products
    const [{ data: zeroQ }, { data: landings }, { data: lowSeo }, { data: products }] = await Promise.all([
      sb.from("search_logs").select("query").eq("results_count", 0).order("created_at", { ascending: false }).limit(30),
      sb.from("seo_landing_pages").select("slug, title, kind"),
      sb.from("seo_meta").select("entity_id, seo_title, score").eq("entity_type", "product").lt("score", 60).limit(30),
      sb.from("products").select("name, category").eq("is_active", true).limit(40),
    ]);

    const context = {
      negocio: "Nutribatidos — ecommerce de batidos nutricionales y suplementos naturales en español",
      busquedas_sin_resultado: (zeroQ ?? []).map((q: any) => q.query),
      landings_existentes: (landings ?? []).map((l: any) => `${l.kind}/${l.slug}: ${l.title}`),
      productos_seo_bajo: (lowSeo ?? []).length,
      productos_muestra: (products ?? []).map((p: any) => `${p.name} (${p.category ?? "—"})`).slice(0, 20),
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un estratega SEO senior para ecommerce de salud y suplementos. Responde SIEMPRE en español, con keywords realistas para el público hispanohablante. Evita claims médicos prohibidos." },
          { role: "user", content: `Genera el plan SEO mensual para este negocio. Contexto:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools: [{ type: "function", function: { name: "save_monthly_plan", description: "Plan mensual completo", parameters: SCHEMA } }],
        tool_choice: { type: "function", function: { name: "save_monthly_plan" } },
      }),
    });

    if (!aiRes.ok) {
      const msg = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI ${aiRes.status}: ${msg}` }), { status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ai = await aiRes.json();
    const toolCall = ai.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const plan = JSON.parse(toolCall.function.arguments);

    const items: any[] = [];
    (plan.blog_posts ?? []).forEach((p: any) => items.push({ kind: "blog", title: p.title, target_keyword: p.target_keyword, notes: p.notes, status: "draft" }));
    (plan.landings ?? []).forEach((p: any) => items.push({ kind: "landing", title: p.title, target_keyword: p.target_keyword, notes: p.notes, status: "draft" }));
    (plan.faqs ?? []).forEach((p: any) => items.push({ kind: "faq", title: p.title, notes: p.notes, status: "draft" }));
    (plan.keywords ?? []).forEach((k: string) => items.push({ kind: "synonym", title: k, target_keyword: k, status: "draft", payload: { kind: "keyword" } }));
    (plan.synonyms ?? []).forEach((k: string) => items.push({ kind: "synonym", title: k, target_keyword: k, status: "draft" }));
    (plan.product_improvements ?? []).forEach((p: any) => items.push({ kind: "product_improvement", title: p.title, notes: p.notes, status: "draft" }));
    (plan.internal_links ?? []).forEach((p: any) => items.push({ kind: "internal_link", title: p.title, target_url: p.target_url, notes: p.notes, status: "draft" }));

    const { error } = await sb.from("seo_content_plan").insert(items);
    if (error) throw error;

    return new Response(JSON.stringify({ inserted: items.length, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
