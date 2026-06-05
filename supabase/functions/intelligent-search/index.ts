// Intelligent search edge function for Nutribatidos
// Receives a free-text query, tries keyword + AI interpretation against
// two sources of truth:
//   - public.search_needs (legacy "necesidades")
//   - public.purchase_intents (Fase 1 - Home Inteligente IA)
// Returns a structured result for the frontend to render.
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, safeJsonParse, type AIProvider } from "../_shared/ai-provider.ts";


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
  // optional extras coming from purchase_intents
  banner_image?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  title?: string | null;
  subtitle?: string | null;
  source?: "need" | "intent";
};

type LegacySettings = {
  enabled: boolean;
  provider: string;
  model: string;
  search_prompt: string;
  result_mode: string;
  temperature: number;
  max_tokens: number;
  show_whatsapp_fallback: boolean;
};

type RecoSettings = {
  enabled: boolean;
  provider: string;
  model: string;
  temperature: number;
  system_prompt: string;
  api_key_secret_name: string | null;
  base_url: string | null;
};

async function callLovableAi(
  model: string,
  system: string,
  query: string,
  temperature: number,
  maxTokens: number,
) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: query },
      ],
      temperature,
      max_tokens: maxTokens,
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

async function callAi(
  reco: RecoSettings | null,
  legacy: LegacySettings | null,
  query: string,
  needs: Need[],
) {
  const needList = needs
    .map(
      (n) =>
        `- ${n.name} (slug=${n.slug}, categoria=${n.related_category ?? ""}, keywords=${n.keywords.join(", ")})`,
    )
    .join("\n");

  // Prefer the new ai_reco_settings (Lovable AI Gateway by default)
  if (reco && reco.enabled) {
    const system = `${reco.system_prompt}\n\nDevuelve SIEMPRE JSON con esta forma: { "intent": "<slug>", "category": "<categoria>", "message": "<texto>" }.\n\nINTENCIONES Y NECESIDADES DISPONIBLES:\n${needList}`;
    const model = reco.model || "google/gemini-2.5-flash";
    return await callLovableAi(model, system, query, reco.temperature ?? 0.3, 600);
  }

  // Fallback to legacy search_ai_settings
  if (!legacy || !legacy.enabled || legacy.provider === "off") return "";
  const system = `${legacy.search_prompt}\n\nLISTA DE NECESIDADES DISPONIBLES:\n${needList}`;
  const provider = legacy.provider;

  if (provider === "claude") {
    const key = Deno.env.get("CLAUDE_API_KEY");
    if (!key) throw new Error("CLAUDE_API_KEY missing");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: legacy.model || "claude-3-5-haiku-20241022",
        max_tokens: legacy.max_tokens,
        system,
        messages: [{ role: "user", content: query }],
      }),
    });
    const j = await r.json();
    return j?.content?.[0]?.text ?? "";
  }

  if (provider === "deepseek") {
    const key = Deno.env.get("DEEPSEEK_API_KEY");
    if (!key) throw new Error("DEEPSEEK_API_KEY missing");
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: legacy.model || "deepseek-chat",
        messages: [{ role: "system", content: system }, { role: "user", content: query }],
        temperature: legacy.temperature,
        max_tokens: legacy.max_tokens,
        response_format: { type: "json_object" },
      }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? "";
  }

  const model = legacy.model || (provider === "openai" ? "openai/gpt-5-mini" : "google/gemini-2.5-flash");
  return await callLovableAi(model, system, query, legacy.temperature ?? 0.3, legacy.max_tokens ?? 600);
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

function buildResponsePayload(need: Need, source: "need" | "ai") {
  return {
    source,
    need: need.name,
    need_slug: need.slug,
    category_slug: need.related_category,
    product_ids: need.related_products ?? [],
    message: need.message ?? `Productos recomendados para ${need.name}.`,
    // intent enrichment (only present when matched against purchase_intents)
    intent_slug: need.source === "intent" ? need.slug : null,
    intent_title: need.title ?? null,
    intent_subtitle: need.subtitle ?? null,
    intent_banner: need.banner_image ?? null,
    intent_cta_text: need.cta_text ?? null,
    intent_cta_url: need.cta_url ?? null,
  };
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

    const [legacyRes, recoRes, needsRes, intentsRes] = await Promise.all([
      supabase.from("search_ai_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("ai_reco_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("search_needs").select("*").eq("is_active", true).order("priority"),
      supabase.from("purchase_intents").select("*").eq("is_active", true).order("priority"),
    ]);
    const legacy = (legacyRes.data ?? null) as LegacySettings | null;
    const reco = (recoRes.data ?? null) as RecoSettings | null;
    const legacyNeeds = ((needsRes.data ?? []) as any[]).map((n) => ({ ...n, source: "need" as const }));
    const intentNeeds: Need[] = ((intentsRes.data ?? []) as any[]).map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      keywords: i.keywords ?? [],
      intent: i.slug,
      related_category: (i.category_slugs ?? [])[0] ?? null,
      related_products: i.product_ids ?? [],
      message: i.description ?? null,
      priority: i.priority ?? 100,
      banner_image: i.banner_image ?? null,
      cta_text: i.cta_text ?? null,
      cta_url: i.cta_url ?? null,
      title: i.title ?? null,
      subtitle: i.subtitle ?? null,
      source: "intent",
    }));

    // Intents take priority over legacy needs
    const needs: Need[] = [...intentNeeds, ...legacyNeeds];
    const q = norm(query);

    // 1) Keyword match
    let matched: Need | null = null;
    for (const n of needs) {
      const hit = (n.keywords ?? []).some((k) => {
        const kn = norm(k);
        return kn && (q === kn || q.includes(kn) || kn.includes(q));
      }) || norm(n.name) === q;
      if (hit) { matched = n; break; }
    }
    if (matched) {
      return new Response(JSON.stringify(buildResponsePayload(matched, "need")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) AI fallback
    try {
      const raw = await callAi(reco, legacy, query, needs);
      const parsed = parseAiJson(raw);
      if (parsed && (parsed.need || parsed.category || parsed.intent)) {
        const mapped = needs.find(
          (n) =>
            norm(n.slug) === norm(parsed.intent || "") ||
            norm(n.name) === norm(parsed.need || "") ||
            norm(n.related_category || "") === norm(parsed.category || ""),
        );
        if (mapped) {
          return new Response(JSON.stringify(buildResponsePayload(mapped, "ai")), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({
          source: "ai",
          need: parsed.need ?? null,
          need_slug: null,
          category_slug: parsed.category ?? null,
          product_ids: [],
          ai_products: Array.isArray(parsed.products) ? parsed.products : [],
          message: parsed.message ?? null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (e) {
      console.error("AI error", e);
    }

    // 3) Nothing -> fallback
    return new Response(JSON.stringify({
      source: "none",
      fallback_whatsapp: legacy?.show_whatsapp_fallback ?? true,
      message: "No encontramos un producto exacto, pero podemos ayudarte a elegir uno según tu necesidad.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("intelligent-search error", err);
    return new Response(JSON.stringify({ source: "none", error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
