// Fase 21 — AI optimization of product listings.
// Computes CTR & conversion rate per product from lucia_events/product_events/orders,
// asks the AI to rewrite low-performing titles/descriptions/meta/alt-text, and
// logs each suggestion to ai_product_seo_log. Admin can apply suggestions later.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI, safeJsonParse } from "../_shared/ai-provider.ts";

const MODEL = "google/gemini-2.5-flash";


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;


    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = String(body.action ?? "analyze"); // analyze | suggest | apply
    const windowDays: number = Number(body.window_days ?? 30);

    if (action === "apply") {
      const logId: string = String(body.log_id ?? "");
      if (!logId) return json({ error: "log_id required" }, 400);
      const { data: log } = await admin.from("ai_product_seo_log").select("*").eq("id", logId).single();
      if (!log) return json({ error: "log not found" }, 404);
      const patch: any = {};
      const f = log.field;
      if (["name", "short_description", "description"].includes(f)) {
        patch[f] = log.after_value;
        const { error } = await admin.from("products").update(patch).eq("id", log.product_id);
        if (error) return json({ error: error.message }, 500);
      } else if (["meta_title", "meta_description"].includes(f)) {
        const { data: meta } = await admin.from("seo_meta").select("*")
          .eq("entity_type", "product").eq("entity_id", log.product_id).maybeSingle();
        const next = { entity_type: "product", entity_id: log.product_id, [`seo_${f.replace("meta_", "")}`]: log.after_value, ...(meta ?? {}) };
        next[`seo_${f.replace("meta_", "")}`] = log.after_value;
        const { error } = await admin.from("seo_meta").upsert(next, { onConflict: "entity_type,entity_id" });
        if (error) return json({ error: error.message }, 500);
      } else if (f === "alt_text") {
        const { error } = await admin.from("seo_image_alts").upsert({
          entity_type: "product", entity_id: log.product_id,
          image_url: "main", alt_text: log.after_value,
        } as any);
        if (error) return json({ error: error.message }, 500);
      }
      await admin.from("ai_product_seo_log").update({ applied: true, applied_at: new Date().toISOString() }).eq("id", logId);
      return json({ ok: true });
    }

    // ANALYZE: compute metrics for all products in window
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();
    const [{ data: products }, { data: evs }, { data: orderItems }] = await Promise.all([
      admin.from("products")
        .select("id, name, slug, short_description, description, category, brand, goal, main_ingredient, price, main_image")
        .eq("is_active", true).eq("approval_status", "approved").limit(500),
      admin.from("lucia_events")
        .select("event_type, metadata")
        .in("event_type", ["browse_product_view", "browse_add_to_cart"])
        .gte("created_at", since).limit(20000),
      admin.from("order_items")
        .select("product_id, created_at")
        .gte("created_at", since).limit(20000),
    ]);

    const views = new Map<string, number>();
    const carts = new Map<string, number>();
    const buys = new Map<string, number>();
    for (const e of (evs ?? []) as any[]) {
      const pid = e.metadata?.product_id;
      if (!pid) continue;
      if (e.event_type === "browse_product_view") views.set(pid, (views.get(pid) ?? 0) + 1);
      else if (e.event_type === "browse_add_to_cart") carts.set(pid, (carts.get(pid) ?? 0) + 1);
    }
    for (const oi of (orderItems ?? []) as any[]) {
      if (oi.product_id) buys.set(oi.product_id, (buys.get(oi.product_id) ?? 0) + 1);
    }

    const metricsRows: any[] = [];
    const enriched = (products ?? []).map((p: any) => {
      const v = views.get(p.id) ?? 0;
      const c = carts.get(p.id) ?? 0;
      const b = buys.get(p.id) ?? 0;
      const ctr = v > 0 ? c / v : 0;
      const conv = v > 0 ? b / v : 0;
      metricsRows.push({
        product_id: p.id, impressions: v, views: v, add_to_cart: c, purchases: b,
        ctr, conversion_rate: conv, window_days: windowDays, computed_at: new Date().toISOString(),
      });
      return { ...p, views: v, ctr, conv };
    });
    if (metricsRows.length) await admin.from("product_seo_metrics").upsert(metricsRows, { onConflict: "product_id" });

    if (action === "analyze") {
      return json({ ok: true, total: enriched.length, top_underperformers: pickUnderperformers(enriched, 20) });
    }

    // SUGGEST: pick worst N and ask AI for rewrites
    const limit: number = Math.min(Number(body.limit ?? 5), 20);
    const targets = pickUnderperformers(enriched, limit);
    const suggestions: any[] = [];

    for (const p of targets) {
      const sys = "Eres copywriter SEO experto en e-commerce de suplementos en Perú. Devuelves JSON estricto.";
      const prompt = `Optimiza esta ficha por bajo rendimiento (vistas=${p.views}, CTR=${(p.ctr * 100).toFixed(1)}%, conv=${(p.conv * 100).toFixed(1)}%).
Producto actual:
- Nombre: ${p.name}
- Categoría: ${p.category ?? "-"} · Marca: ${p.brand ?? "-"} · Goal: ${p.goal ?? "-"}
- Short: ${p.short_description ?? "-"}
- Descripción: ${(p.description ?? "").slice(0, 600)}

Devuelve JSON:
{
 "name": "título mejorado (mismo producto, más clicable, <70c)",
 "short_description": "tagline <140c con beneficio + diferencial",
 "meta_title": "<60c con keyword principal",
 "meta_description": "150-160c persuasiva",
 "alt_text": "alt accesible y descriptivo <120c",
 "reason": "una frase explicando por qué este rewrite mejora CTR/conv",
 "score": 0-100
}`;

      const aiRes = await fetch(LOVABLE_AI, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) continue;
      const aj = await aiRes.json();
      let s: any = {};
      try { s = JSON.parse(aj?.choices?.[0]?.message?.content ?? "{}"); } catch {}
      const fields: Array<[string, string | null, string | null]> = [
        ["name", p.name, s.name ?? null],
        ["short_description", p.short_description, s.short_description ?? null],
        ["meta_title", null, s.meta_title ?? null],
        ["meta_description", null, s.meta_description ?? null],
        ["alt_text", null, s.alt_text ?? null],
      ];
      const rows = fields
        .filter(([, , after]) => after && after !== null)
        .map(([field, before, after]) => ({
          product_id: p.id, field, before_value: before, after_value: after,
          ai_reason: s.reason ?? null, ai_score: s.score ?? null,
          ctr_before: p.ctr, conv_before: p.conv, views_window: p.views,
          model: MODEL,
        }));
      if (rows.length) {
        const { data: inserted } = await admin.from("ai_product_seo_log").insert(rows).select("id, field, after_value");
        suggestions.push({ product_id: p.id, name: p.name, suggestions: inserted });
      }
    }
    return json({ ok: true, generated: suggestions.length, suggestions });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function pickUnderperformers(rows: any[], n: number) {
  // products with at least 5 views, ranked by lowest CTR then lowest conv
  return rows
    .filter((r) => r.views >= 5)
    .sort((a, b) => (a.ctr - b.ctr) || (a.conv - b.conv))
    .slice(0, n);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
