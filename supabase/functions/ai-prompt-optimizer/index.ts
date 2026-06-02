// Phase 11 — AI Prompt Optimizer
// Reads the active system prompt for a given function + 30d conversion signals
// (clicks/orders by source, top non-converting slugs) and asks Lovable AI to
// propose a refined system prompt.
//
// Returns: { suggested_prompt, rationale, metrics_used }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Body = { function_name: string };

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SOURCE_BY_FN: Record<string, string> = {
  "ai-cart-recommendations": "ai_cart",
  "ai-product-related": "ai_product_related",
  "ai-post-purchase": "ai_post_purchase",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const function_name = String(body?.function_name ?? "").trim();
    if (!function_name) {
      return json({ error: "function_name required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Active prompt
    const { data: promptRow } = await supabase
      .from("ai_prompt_versions")
      .select("system_prompt, notes, created_at")
      .eq("function_name", function_name)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activePrompt = promptRow?.system_prompt ?? "(sin override — usa el prompt por defecto del código)";

    // 2) Last-30d metrics scoped to this function's source
    const source = SOURCE_BY_FN[function_name];
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sinceOrders = new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: clicks }, { data: orders }] = await Promise.all([
      supabase
        .from("lucia_events")
        .select("product_slug, visitor_id, metadata, created_at")
        .eq("event_type", "ai_reco_click")
        .gte("created_at", since)
        .limit(5000),
      supabase
        .from("orders")
        .select("id, visitor_id, total, created_at")
        .gte("created_at", sinceOrders)
        .not("visitor_id", "is", null)
        .in("status", ["confirmed", "preparing", "shipped", "delivered"])
        .limit(5000),
    ]);

    const sourceClicks = (clicks ?? []).filter((c: any) => c.metadata?.source === source);
    const slugCounts = new Map<string, { clicks: number; reasons: Set<string> }>();
    for (const c of sourceClicks as any[]) {
      if (!c.product_slug) continue;
      const cur = slugCounts.get(c.product_slug) ?? { clicks: 0, reasons: new Set() };
      cur.clicks += 1;
      if (c.metadata?.reason) cur.reasons.add(String(c.metadata.reason));
      slugCounts.set(c.product_slug, cur);
    }

    // Attribute orders within 7d after click per visitor
    const ordersByVisitor = new Map<string, any[]>();
    for (const o of (orders ?? []) as any[]) {
      const arr = ordersByVisitor.get(o.visitor_id) ?? [];
      arr.push(o);
      ordersByVisitor.set(o.visitor_id, arr);
    }
    const winMs = 7 * 24 * 60 * 60 * 1000;
    let convertedClicks = 0;
    let revenue = 0;
    const attributedOrders = new Set<string>();
    for (const c of sourceClicks as any[]) {
      if (!c.visitor_id) continue;
      const clickTs = new Date(c.created_at).getTime();
      for (const o of ordersByVisitor.get(c.visitor_id) ?? []) {
        const ots = new Date(o.created_at).getTime();
        if (ots >= clickTs && ots - clickTs <= winMs) {
          convertedClicks += 1;
          if (!attributedOrders.has(o.id)) {
            attributedOrders.add(o.id);
            revenue += Number(o.total) || 0;
          }
          break;
        }
      }
    }

    const topClicked = [...slugCounts.entries()]
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 10)
      .map(([slug, v]) => ({ slug, clicks: v.clicks, reasons: [...v.reasons].slice(0, 3) }));

    const metrics_used = {
      window_days: 30,
      source,
      total_clicks: sourceClicks.length,
      converted_clicks: convertedClicks,
      cvr_pct: sourceClicks.length > 0 ? +(convertedClicks / sourceClicks.length * 100).toFixed(2) : 0,
      attributed_orders: attributedOrders.size,
      attributed_revenue: +revenue.toFixed(2),
      top_clicked: topClicked,
    };

    // 3) Ask Lovable AI for a refined prompt
    const metaPrompt = `Eres un experto en prompt engineering para sistemas de recomendación de e-commerce.
Analiza el SYSTEM PROMPT actual de la función "${function_name}" y las MÉTRICAS reales de los últimos 30 días, y propón un SYSTEM PROMPT mejorado.

OBJETIVO: aumentar la tasa de conversión (CVR) y el revenue atribuido manteniendo la utilidad para el usuario. No inventes datos. No cambies el formato JSON de salida que la función exige. Mantén el idioma español neutro.

DEVUELVE estrictamente este JSON:
{
  "suggested_prompt": "<nuevo system prompt completo, listo para pegar>",
  "rationale": "<3-6 bullets cortos explicando qué cambiaste y por qué, basado en las métricas>"
}`;

    const userPayload = {
      active_prompt: activePrompt,
      metrics: metrics_used,
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: metaPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: `AI gateway: ${aiRes.status} ${txt}` }, 502);
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { suggested_prompt: content, rationale: "" }; }

    return json({
      suggested_prompt: parsed.suggested_prompt ?? "",
      rationale: parsed.rationale ?? "",
      metrics_used,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
