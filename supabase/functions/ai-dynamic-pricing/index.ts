// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const { action = "evaluate", session_id = null, context = {} } = body;
    // SECURITY: never trust user_id from body. Derive it from the JWT.
    let user_id: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: claimsData } = await sb.auth.getClaims(token);
        user_id = (claimsData?.claims?.sub as string) ?? null;
      }
    } catch (_e) {
      user_id = null;
    }

    // ----- Admin action: AI suggests new pricing rules -----
    if (action === "suggest") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "missing key" }, 500);
      const { data: segments } = await sb.from("customer_segments").select("code,name,description").eq("is_active", true);
      const prompt = `Eres un experto en pricing y CRM para una marca de superalimentos peruanos (Nutribatidos).
Sugiere 3 reglas de descuento dinámico por segmento, en JSON estricto:
{"rules":[{"segment_code":"...","scope":"global|category|brand","target_value":"opcional","discount_percent":<num>,"message":"...","priority":<num>}]}
Segmentos disponibles: ${JSON.stringify(segments)}.
Contexto del negocio: ${JSON.stringify(context)}.
Reglas: descuentos entre 5 y 20%, mensajes breves en español, sin emojis.`;
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return json({ error: "ai_failed", details: await r.text() }, 502);
      const j = await r.json();
      const content = j.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
      return json({ suggestions: parsed.rules ?? [] });
    }

    // ----- Evaluate: classify user, return best rule -----
    let segment_code = "new_visitor";
    let stats = { orders: 0, total_spent: 0, days_since_last: null as number | null, aov: 0 };

    if (user_id) {
      const { data: orders } = await sb
        .from("orders")
        .select("total,created_at,status")
        .eq("user_id", user_id)
        .in("status", ["confirmed", "preparing", "shipped", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);
      const list = orders ?? [];
      const total = list.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const aov = list.length ? total / list.length : 0;
      const last = list[0]?.created_at ? new Date(list[0].created_at) : null;
      const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
      stats = { orders: list.length, total_spent: total, days_since_last: days, aov };

      if (list.length === 0) segment_code = "new_visitor";
      else if (days !== null && days > 60) segment_code = "at_risk";
      else if (list.length >= 6 || aov > 200) segment_code = "vip";
      else if (list.length >= 2) segment_code = "recurring";
      else segment_code = "new_visitor";
    }

    const { data: segment } = await sb.from("customer_segments").select("*").eq("code", segment_code).maybeSingle();
    if (!segment) return json({ segment_code, rule: null, discount_percent: 0, message: null, stats });

    const now = new Date().toISOString();
    const { data: rules } = await sb
      .from("dynamic_pricing_rules")
      .select("*")
      .eq("segment_id", segment.id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    const scope = context.scope ?? "global";
    const target = context.target_value ?? null;
    const valid = (rules ?? []).filter((r: any) => {
      if (r.starts_at && r.starts_at > now) return false;
      if (r.ends_at && r.ends_at < now) return false;
      if (r.scope === "global") return true;
      if (r.scope === scope && (!r.target_value || r.target_value === target)) return true;
      return false;
    });

    const best = valid[0] ?? null;

    // Log application
    await sb.from("dynamic_pricing_logs").insert({
      user_id,
      session_id,
      segment_code,
      rule_id: best?.id ?? null,
      discount_percent: best?.discount_percent ?? 0,
      context,
    });

    return json({
      segment_code,
      segment_name: segment.name,
      rule: best,
      discount_percent: Number(best?.discount_percent ?? 0),
      message: best?.message ?? null,
      stats,
    });
  } catch (e: any) {
    console.error("ai-dynamic-pricing error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
