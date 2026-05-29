import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type ComboCandidate = {
  combo_id: string;
  name: string;
  description?: string | null;
  price_normal: number;
  price_combo: number;
  need_tag?: string | null;
  products: string[];
};

type Body = {
  context: Record<string, unknown>;
  candidates: ComboCandidate[];
};

async function loadConfig() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/combo_config?select=ai_provider,ai_prompt&limit=1`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
  });
  const rows = await res.json();
  return rows?.[0] ?? null;
}

function buildPrompt(systemPrompt: string, body: Body) {
  const user = `Contexto: ${JSON.stringify(body.context)}\n\nCombos disponibles (responde solo con estos combo_id):\n${JSON.stringify(body.candidates, null, 2)}\n\nDevuelve JSON {"recommendations":[{"combo_id":"<uuid>","reason":"...","message":"..."}]} con máximo ${body.candidates.length} ítems.`;
  return { system: systemPrompt, user };
}

async function callLovableAI(model: string, system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY!,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Lovable AI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callDeepSeek(system: string, user: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = await loadConfig();
    const systemPrompt: string = cfg?.ai_prompt ?? "Recomienda combos en JSON.";
    const provider: string = cfg?.ai_provider ?? "gemini";

    const { system, user } = buildPrompt(systemPrompt, body);

    let raw = "";
    if (provider === "deepseek") {
      if (!DEEPSEEK_API_KEY) throw new Error("Missing DEEPSEEK_API_KEY");
      raw = await callDeepSeek(system, user);
    } else {
      if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");
      const model =
        provider === "openai" ? "openai/gpt-5-mini"
        : provider === "claude" ? "openai/gpt-5-mini" // claude no expuesto vía gateway todavía → fallback
        : "google/gemini-3-flash-preview";
      raw = await callLovableAI(model, system, user);
    }

    let parsed: { recommendations?: Array<{ combo_id: string; reason?: string; message?: string }> } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return new Response(
      JSON.stringify({ recommendations: parsed.recommendations ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ recommendations: [], error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
