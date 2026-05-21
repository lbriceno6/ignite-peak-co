// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function fetchContextProducts(opts: {
  productSlug?: string | null;
  category?: string | null;
  landing?: { kind: string; field?: string | null; value?: string | null } | null;
  query?: string;
}) {
  // Try priority match first
  if (opts.productSlug) {
    const { data: cur } = await admin
      .from("products")
      .select("id,slug,name,short_description,description,price,sale_price,stock,main_image,category,goal,main_ingredient")
      .eq("slug", opts.productSlug)
      .eq("is_active", true)
      .maybeSingle();
    const related = await admin
      .from("products")
      .select("id,slug,name,short_description,price,sale_price,stock,main_image,category,goal,main_ingredient")
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .neq("slug", opts.productSlug)
      .eq("category", cur?.category ?? "")
      .limit(5);
    return [cur, ...(related.data ?? [])].filter(Boolean);
  }
  let q = admin
    .from("products")
    .select("id,slug,name,short_description,price,sale_price,stock,main_image,category,goal,main_ingredient")
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .limit(8);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.landing?.field && opts.landing?.value) q = q.eq(opts.landing.field as any, opts.landing.value);
  const { data } = await q;
  if (data && data.length) return data;
  // search by query
  if (opts.query) {
    const { data: s } = await admin.rpc("search_products", { q: opts.query });
    return s ?? [];
  }
  return [];
}

async function callLLM(opts: {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: ChatMsg[];
}) {
  const { provider, model, temperature, maxTokens, messages } = opts;
  const start = Date.now();

  // DeepSeek (OpenAI-compatible)
  if (provider === "deepseek") {
    const key = Deno.env.get("DEEPSEEK_API_KEY");
    if (!key) throw new Error("DEEPSEEK_API_KEY missing");
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "deepseek-chat", messages, temperature, max_tokens: maxTokens }),
    });
    if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return {
      content: j.choices?.[0]?.message?.content ?? "",
      tokens_in: j.usage?.prompt_tokens ?? null,
      tokens_out: j.usage?.completion_tokens ?? null,
      latency_ms: Date.now() - start,
    };
  }

  // OpenAI direct
  if (provider === "openai_direct") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY missing");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "gpt-4o-mini", messages, temperature, max_tokens: maxTokens }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return {
      content: j.choices?.[0]?.message?.content ?? "",
      tokens_in: j.usage?.prompt_tokens ?? null,
      tokens_out: j.usage?.completion_tokens ?? null,
      latency_ms: Date.now() - start,
    };
  }

  // Claude
  if (provider === "claude") {
    const key = Deno.env.get("CLAUDE_API_KEY");
    if (!key) throw new Error("CLAUDE_API_KEY missing");
    const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const conv = messages.filter((m) => m.role !== "system");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: maxTokens,
        temperature,
        system: sys,
        messages: conv,
      }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return {
      content: j.content?.[0]?.text ?? "",
      tokens_in: j.usage?.input_tokens ?? null,
      tokens_out: j.usage?.output_tokens ?? null,
      latency_ms: Date.now() - start,
    };
  }

  // Gemini direct
  if (provider === "gemini_direct") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY missing");
    const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return {
      content: text,
      tokens_in: j.usageMetadata?.promptTokenCount ?? null,
      tokens_out: j.usageMetadata?.candidatesTokenCount ?? null,
      latency_ms: Date.now() - start,
    };
  }

  // Default: Lovable AI Gateway (OpenAI-compatible)
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "google/gemini-2.5-flash",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    if (r.status === 429) throw new Error("Rate limit excedido. Intenta en unos segundos.");
    if (r.status === 402) throw new Error("Sin créditos de IA. Agrega créditos en Workspace > Usage.");
    throw new Error(`Lovable AI ${r.status}: ${t}`);
  }
  const j = await r.json();
  return {
    content: j.choices?.[0]?.message?.content ?? "",
    tokens_in: j.usage?.prompt_tokens ?? null,
    tokens_out: j.usage?.completion_tokens ?? null,
    latency_ms: Date.now() - start,
  };
}

function extractMatchedSlugs(text: string, products: any[]) {
  const matched: string[] = [];
  const low = text.toLowerCase();
  for (const p of products) {
    if (!p?.slug) continue;
    if (low.includes(p.name.toLowerCase()) || low.includes(p.slug.toLowerCase())) {
      matched.push(p.slug);
    }
  }
  return matched.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      session_id,
      message,
      context = {},
      history = [],
      test_mode = false,
      override_prompt = null,
      tracking = {},
    } = body;

    // Server-side only: capture headers for geolocation/IP (never returned to client)
    const ipHeader = req.headers.get("x-forwarded-for") || "";
    const ip = ipHeader.split(",")[0].trim() || null;
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const acceptLanguage = req.headers.get("accept-language") || null;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load settings
    const { data: settings } = await admin.from("chat_ai_settings").select("*").eq("id", 1).maybeSingle();
    const s = settings ?? {
      provider: "gemini",
      model: "google/gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 800,
      history_size: 10,
      save_conversations: true,
    };

    // Load active prompt
    const { data: prompt } = await admin
      .from("chat_ai_prompts")
      .select("*")
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const promptSource = override_prompt ?? prompt;

    // Load context products
    const products = await fetchContextProducts({
      productSlug: context.productSlug,
      category: context.category,
      landing: context.landing,
      query: message,
    });

    const productCtx = products
      .filter(Boolean)
      .slice(0, 6)
      .map((p: any) => ({
        slug: p.slug,
        name: p.name,
        price: p.sale_price ?? p.price,
        stock: p.stock,
        image: p.main_image,
        short: p.short_description,
        category: p.category,
        goal: p.goal,
      }));

    const systemParts = [
      promptSource?.system_prompt || "Eres Lucía, asesora de Nutribatidos.",
      promptSource?.business_rules ? `REGLAS DE NEGOCIO:\n${promptSource.business_rules}` : "",
      promptSource?.safety_rules ? `REGLAS DE SEGURIDAD:\n${promptSource.safety_rules}` : "",
      promptSource?.sales_rules ? `FLUJO DE VENTA:\n${promptSource.sales_rules}` : "",
      promptSource?.fallback_rules ? `FALLBACK:\n${promptSource.fallback_rules}` : "",
      `CONTEXTO ACTUAL:\n- Página: ${context.page ?? "/"}\n- Producto actual: ${context.productSlug ?? "ninguno"}\n- Categoría: ${context.category ?? "ninguna"}`,
      `PRODUCTOS DISPONIBLES (usa solo estos, no inventes):\n${JSON.stringify(productCtx, null, 2)}`,
      `Cuando recomiendes un producto, menciona su nombre exacto tal como aparece arriba para que se muestre la tarjeta.`,
    ].filter(Boolean);

    const trimmedHistory = (history as ChatMsg[]).slice(-Number(s.history_size ?? 10));

    const messages: ChatMsg[] = [
      { role: "system", content: systemParts.join("\n\n") },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    // Map provider to actual call key
    let providerKey = s.provider;
    if (providerKey === "openai") providerKey = "openai_direct"; // direct OpenAI uses OPENAI_API_KEY
    if (providerKey === "gemini") providerKey = "lovable"; // gemini via Lovable Gateway
    // explicit gemini_direct/openai_direct/deepseek/claude pass through

    const result = await callLLM({
      provider: providerKey,
      model: s.model,
      temperature: Number(s.temperature ?? 0.7),
      maxTokens: Number(s.max_tokens ?? 800),
      messages,
    });

    const matched = extractMatchedSlugs(result.content, productCtx);
    const matchedProducts = productCtx.filter((p) => matched.includes(p.slug));

    // Persist
    if (s.save_conversations && !test_mode && session_id) {
      const utm = tracking.utm || {};
      const dev = tracking.device || {};
      const locData = { country, city, ip_country: country };

      const { error: sessErr } = await admin
        .from("chat_ai_sessions")
        .upsert(
          {
            session_id,
            last_page: context.page,
            first_page: context.page,
            current_product_id: context.productId ?? null,
            visitor_id: tracking.visitor_id ?? null,
            referrer: tracking.referrer ?? null,
            source: tracking.source ?? null,
            medium: tracking.medium ?? null,
            campaign: tracking.campaign ?? null,
            device_type: dev.device_type ?? null,
            browser: dev.browser ?? null,
            os: dev.os ?? null,
            country,
            city,
            timezone: dev.timezone ?? null,
            consent_snapshot: tracking.consent ?? null,
            landing_page: tracking.landing_page ?? null,
            last_product_viewed: context.productSlug ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id", ignoreDuplicates: false },
        );
      if (sessErr) console.error("session upsert err", sessErr);

      const msgBase = {
        visitor_id: tracking.visitor_id ?? null,
        source: tracking.source ?? null,
        referrer: tracking.referrer ?? null,
        utm_data: utm,
        device_data: dev,
        location_data: locData,
      };

      const { error: msgErr } = await admin.from("chat_ai_messages").insert([
        {
          session_id,
          role: "user",
          content: message,
          current_page: context.page,
          product_id: context.productId ?? null,
          matched_products: [],
          ...msgBase,
        },
        {
          session_id,
          role: "assistant",
          content: result.content,
          provider: s.provider,
          model: s.model,
          current_page: context.page,
          product_id: context.productId ?? null,
          matched_products: matchedProducts ?? [],
          prompt_version_id: prompt?.id ?? null,
          tokens_input: result.tokens_in,
          tokens_output: result.tokens_out,
          latency_ms: result.latency_ms,
          ...msgBase,
        },
      ]);
      if (msgErr) console.error("messages insert err", msgErr);
    }

    return new Response(
      JSON.stringify({
        reply: result.content,
        products: matchedProducts,
        tokens: { input: result.tokens_in, output: result.tokens_out },
        latency_ms: result.latency_ms,
        provider: s.provider,
        model: s.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-chat error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
