// Fase 16 — AI inventory forecast.
// Computes sales velocity for each active product over a window (default 30 days),
// asks Lovable AI to prioritize and suggest restock with reasoning, returns a list
// sorted by risk. Admin-only: requires JWT and admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAID_STATES = ["confirmed", "preparing", "shipped", "delivered"];

function parseJsonLoose(s: string): any | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    // Admin auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const windowDays = Math.max(7, Math.min(120, Number(body?.window_days ?? 30)));
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();

    // Load active products
    const { data: products } = await admin
      .from("products")
      .select("id, slug, name, category, stock, price, sale_price, main_image")
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .limit(500);

    if (!products?.length) {
      return new Response(JSON.stringify({ items: [], window_days: windowDays }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sales velocity: sum quantities per product_slug from paid orders
    const { data: paidOrders } = await admin
      .from("orders")
      .select("id, created_at, status")
      .gte("created_at", since)
      .in("status", PAID_STATES);
    const orderIds = (paidOrders ?? []).map((o: any) => o.id);

    const sold: Record<string, number> = {};
    if (orderIds.length) {
      // chunk to avoid URL length issues
      const chunk = 200;
      for (let i = 0; i < orderIds.length; i += chunk) {
        const slice = orderIds.slice(i, i + chunk);
        const { data: items } = await admin
          .from("order_items")
          .select("product_slug, quantity")
          .in("order_id", slice);
        for (const it of items ?? []) {
          sold[(it as any).product_slug] = (sold[(it as any).product_slug] ?? 0) + (it as any).quantity;
        }
      }
    }

    const rows = products.map((p: any) => {
      const totalSold = sold[p.slug] ?? 0;
      const daily = totalSold / windowDays;
      const stock = Number(p.stock ?? 0);
      const daysToStockout = daily > 0 ? Math.round(stock / daily) : null;
      // Suggested restock = 30 days of expected demand, minimum 5 if any sales
      const suggested = daily > 0 ? Math.max(5, Math.ceil(daily * 30) - stock) : 0;
      let risk: "critical" | "warning" | "ok" | "no_sales" = "no_sales";
      if (daily === 0) risk = "no_sales";
      else if (stock <= 0) risk = "critical";
      else if (daysToStockout !== null && daysToStockout <= 7) risk = "critical";
      else if (daysToStockout !== null && daysToStockout <= 14) risk = "warning";
      else risk = "ok";
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        image: p.main_image,
        stock,
        sold_window: totalSold,
        daily_velocity: Math.round(daily * 100) / 100,
        days_to_stockout: daysToStockout,
        suggested_restock: Math.max(0, suggested),
        risk,
      };
    });

    rows.sort((a, b) => {
      const order = { critical: 0, warning: 1, ok: 2, no_sales: 3 } as const;
      if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
      return (a.days_to_stockout ?? 9999) - (b.days_to_stockout ?? 9999);
    });

    // Ask AI for prioritization narrative on top risks (limit cost)
    let aiNarrative: string | null = null;
    const topRisks = rows.filter((r) => r.risk === "critical" || r.risk === "warning").slice(0, 15);
    if (apiKey && topRisks.length) {
      try {
        const system = `Eres analista de inventario para una tienda de suplementos.
Devuelve un JSON: {"summary":"...","priorities":[{"slug":"...","action":"...","reasoning":"..."}]}
- summary: 1-2 frases en español sobre el estado general del stock.
- priorities: top 5 productos a reabastecer ya, action breve ("Reordenar ahora", "Aumentar stock", etc.), reasoning ≤ 20 palabras.
Sé concreto y accionable, sin emojis.`;
        const user = JSON.stringify({ window_days: windowDays, top_risks: topRisks });
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const parsed = parseJsonLoose(j?.choices?.[0]?.message?.content ?? "") ?? {};
          aiNarrative = JSON.stringify(parsed);
        }
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      window_days: windowDays,
      total_products: rows.length,
      counts: {
        critical: rows.filter((r) => r.risk === "critical").length,
        warning: rows.filter((r) => r.risk === "warning").length,
        ok: rows.filter((r) => r.risk === "ok").length,
        no_sales: rows.filter((r) => r.risk === "no_sales").length,
      },
      items: rows,
      ai: aiNarrative ? JSON.parse(aiNarrative) : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
