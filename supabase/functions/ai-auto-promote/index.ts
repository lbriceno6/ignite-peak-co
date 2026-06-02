// Phase 13 — Auto-promotion (multi-armed bandit) of A/B prompt variants.
// Reads recent ai_reco_click events + attributed orders, computes RPC per variant,
// and (if applied) sets the winning variant to 100% traffic_weight and others to 0.
// Always logs the decision to ai_promotion_log.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ATTRIBUTION_WINDOW_DAYS = 7;
const MIN_CLICKS = 20; // minimum sample size per variant to be eligible

const FN_TO_SRC: Record<string, string[]> = {
  "ai-cart-recommendations": ["ai_cart", "ai_checkout"],
  "ai-product-related": ["ai_product_related"],
  "ai-post-purchase": ["ai_post_purchase"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const functionName: string = body.function_name;
    const windowDays: number = Number(body.window_days ?? 30);
    const apply: boolean = Boolean(body.apply ?? false);

    if (!functionName || !FN_TO_SRC[functionName]) {
      return new Response(JSON.stringify({ error: "invalid function_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sources = FN_TO_SRC[functionName];
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();
    const sinceOrders = new Date(
      Date.now() - (windowDays + ATTRIBUTION_WINDOW_DAYS) * 86400000,
    ).toISOString();

    const [{ data: events }, { data: orders }, { data: versions }] = await Promise.all([
      admin.from("lucia_events")
        .select("visitor_id, metadata, created_at")
        .eq("event_type", "ai_reco_click")
        .gte("created_at", since)
        .limit(20000),
      admin.from("orders")
        .select("id, visitor_id, total, created_at")
        .gte("created_at", sinceOrders)
        .not("visitor_id", "is", null)
        .in("status", ["confirmed", "preparing", "shipped", "delivered"])
        .limit(20000),
      admin.from("ai_prompt_versions")
        .select("id, function_name, variant_label, traffic_weight, is_active")
        .eq("function_name", functionName),
    ]);

    // index orders by visitor
    const ordByVisitor = new Map<string, any[]>();
    for (const o of orders ?? []) {
      if (!o.visitor_id) continue;
      const arr = ordByVisitor.get(o.visitor_id) ?? [];
      arr.push(o);
      ordByVisitor.set(o.visitor_id, arr);
    }
    const winMs = ATTRIBUTION_WINDOW_DAYS * 86400000;

    // Aggregate per prompt id
    const agg = new Map<string, {
      promptId: string;
      clicks: number;
      visitors: Set<string>;
      orders: Set<string>;
      revenue: number;
    }>();

    for (const ev of events ?? []) {
      const src = ev.metadata?.source as string | undefined;
      if (!src || !sources.includes(src)) continue;
      const promptId = ev.metadata?.ai_prompt_id as string | undefined;
      if (!promptId) continue;
      let a = agg.get(promptId);
      if (!a) {
        a = { promptId, clicks: 0, visitors: new Set(), orders: new Set(), revenue: 0 };
        agg.set(promptId, a);
      }
      a.clicks += 1;
      if (!ev.visitor_id) continue;
      a.visitors.add(ev.visitor_id);
      const ts = new Date(ev.created_at).getTime();
      for (const o of ordByVisitor.get(ev.visitor_id) ?? []) {
        const ots = new Date(o.created_at).getTime();
        if (ots >= ts && ots - ts <= winMs && !a.orders.has(o.id)) {
          a.orders.add(o.id);
          a.revenue += Number(o.total) || 0;
        }
      }
    }

    const considered = [...agg.values()].map((a) => {
      const v = (versions ?? []).find((x: any) => x.id === a.promptId);
      return {
        prompt_id: a.promptId,
        label: v?.variant_label ?? null,
        is_active: v?.is_active ?? null,
        traffic_weight: v?.traffic_weight ?? null,
        clicks: a.clicks,
        visitors: a.visitors.size,
        orders: a.orders.size,
        revenue: Number(a.revenue.toFixed(2)),
        rpc: a.clicks > 0 ? Number((a.revenue / a.clicks).toFixed(4)) : 0,
      };
    }).sort((x, y) => y.rpc - x.rpc);

    const eligible = considered.filter((c) => c.clicks >= MIN_CLICKS);
    const winner = eligible[0] ?? null;

    let applied = false;
    let reason: string | null = null;

    if (!winner) {
      reason = `No hay variantes con al menos ${MIN_CLICKS} clicks en ${windowDays}d.`;
    } else if (eligible.length === 1) {
      reason = "Sólo una variante elegible — nada que promover.";
    } else if (apply) {
      // Set winner to 100, others to 0 (and deactivate to stop weighted picks).
      const winnerId = winner.prompt_id;
      const others = (versions ?? []).filter((v: any) => v.id !== winnerId);
      await admin.from("ai_prompt_versions")
        .update({ traffic_weight: 100, is_active: true })
        .eq("id", winnerId);
      for (const v of others) {
        await admin.from("ai_prompt_versions")
          .update({ traffic_weight: 0, is_active: false })
          .eq("id", v.id);
      }
      applied = true;
      reason = `Promovida variante ${winner.label ?? winner.prompt_id.slice(0, 6)} con RPC ${winner.rpc}.`;
    } else {
      reason = "Dry-run: no se aplicaron cambios.";
    }

    await admin.from("ai_promotion_log").insert({
      function_name: functionName,
      window_days: windowDays,
      winner_prompt_id: winner?.prompt_id ?? null,
      winner_label: winner?.label ?? null,
      winner_rpc: winner?.rpc ?? null,
      winner_clicks: winner?.clicks ?? null,
      winner_orders: winner?.orders ?? null,
      considered,
      mode: apply ? "manual_apply" : "dry_run",
      applied,
      reason,
    });

    return new Response(
      JSON.stringify({ ok: true, applied, winner, considered, reason }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
