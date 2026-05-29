// Intelligent search edge function for Nutribatidos
// Receives a free-text query, tries exact / keyword / AI interpretation,
// and returns a structured result for the frontend to render.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type Need = {
  id: string;
  slug: string;
  name: string;
  keywords: string[];
  intent: string | null;
  related_category: string | null;
  related_products: string[];
  message: string | null;
  priority: number;
};

type Settings = {
  enabled: boolean;
  provider: string;
  model: string;
  api_key: string | null;
  prompt_template: string;
  result_mode: string;
  temperature: number;
  max_tokens: number;
  fallback_whatsapp_enabled: boolean;
};

const PROVIDER_ENDPOINTS: Record<string, string> = {
  gemini: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://ai.gateway.lovable.dev/v1/chat/completions",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
};

async function callAi(settings: Settings, query: string, needs: Need[]) {
  const needList = needs
    .map((n) => `- ${n.name} (slug=${n.slug}, categoria=${n.related_category ?? ""}, keywords=${n.keywords.join(", ")})`)
    .join("\n");
  const system = `${settings.prompt_template}\n\nLISTA DE NECESIDADES DISPONIBLES:\n${needList}`;

  const provider = settings.provider;
  if (provider === "claude") {
    const key = settings.api_key;
    if (!key) throw new Error("Claude requires api_key");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: settings.model || "claude-3-5-haiku-20241022",
        max_tokens: settings.max_tokens,
        system,
        messages: [{ role: "user", content: query }],
      }),
    });
    const j = await r.json();
    return j?.content?.[0]?.text ?? "";
  }

  if (provider === "deepseek") {
    const key = settings.api_key;
    if (!key) throw new Error("DeepSeek requires api_key");
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: settings.model || "deepseek-chat",
        messages: [{ role: "system", content: system }, { role: "user", content: query }],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        response_format: { type: "json_object" },
      }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? "";
  }

  // Default: Lovable AI Gateway (gemini/openai)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  const model = settings.model || (provider === "openai" ? "openai/gpt-5-mini" : "google/gemini-2.5-flash");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: query }],
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

function parseAiJson(raw: string): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = String(body?.query ?? "").trim().slice(0, 200);
    if (!query) {
      return new Response(JSON.stringify({ source: "none", message: "Empty query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const [settingsRes, needsRes] = await Promise.all([
      supabase.from("search_ai_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("search_needs").select("*").eq("is_active", true).order("priority"),
    ]);
    const settings = (settingsRes.data ?? {}) as Settings;
    const needs = ((needsRes.data ?? []) as Need[]);

    const q = norm(query);

    // 1) Keyword match against needs
    let matched: Need | null = null;
    for (const n of needs) {
      const hit = n.keywords.some((k) => {
        const kn = norm(k);
        return kn && (q === kn || q.includes(kn) || kn.includes(q));
      }) || norm(n.name) === q;
      if (hit) { matched = n; break; }
    }
    if (matched) {
      return new Response(JSON.stringify({
        source: "need",
        need: matched.name,
        need_slug: matched.slug,
        category_slug: matched.related_category,
        product_ids: matched.related_products,
        message: matched.message ?? `Productos recomendados para ${matched.name}.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) AI fallback
    if (settings.enabled && settings.provider !== "off") {
      try {
        const raw = await callAi(settings, query, needs);
        const parsed = parseAiJson(raw);
        if (parsed && (parsed.need || parsed.category || parsed.intent)) {
          // Try to map AI need to a real one
          const mapped = needs.find(
            (n) =>
              norm(n.slug) === norm(parsed.intent || "") ||
              norm(n.name) === norm(parsed.need || "") ||
              norm(n.related_category || "") === norm(parsed.category || ""),
          );
          return new Response(JSON.stringify({
            source: "ai",
            need: mapped?.name ?? parsed.need ?? null,
            need_slug: mapped?.slug ?? null,
            category_slug: mapped?.related_category ?? parsed.category ?? null,
            product_ids: mapped?.related_products ?? [],
            ai_products: Array.isArray(parsed.products) ? parsed.products : [],
            message: parsed.message ?? mapped?.message ?? null,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.error("AI error", e);
      }
    }

    // 3) Nothing -> fallback
    return new Response(JSON.stringify({
      source: "none",
      fallback_whatsapp: settings.fallback_whatsapp_enabled ?? true,
      message: "No encontramos un producto exacto, pero podemos ayudarte a elegir uno según tu necesidad.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("intelligent-search error", err);
    return new Response(JSON.stringify({ source: "none", error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
