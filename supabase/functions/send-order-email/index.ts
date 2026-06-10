// Sends the post-purchase confirmation email enriched with AI recommendations.
// Triggered from the client right after an order is created.
// Flow:
//   1. Load order + items + profile (service role).
//   2. Build catalog snapshot of approved/active products.
//   3. Ask Lovable AI for thank-you + cross-sell picks (reuses ai-post-purchase prompt).
//   4. Invoke send-transactional-email (one recipient — the buyer).
//   5. Log to ai_email_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseJsonLoose(s: string): any | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function getActivePrompt(
  supa: any,
  name: string,
  fallback: string,
): Promise<{ prompt: string; prompt_id: string | null; variant_label: string | null }> {
  try {
    const { data } = await supa.rpc("get_active_ai_prompt_weighted", { _function_name: name });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && typeof row.system_prompt === "string" && row.system_prompt.trim()) {
      return { prompt: row.system_prompt, prompt_id: row.prompt_id ?? null, variant_label: row.variant_label ?? null };
    }
  } catch (_) {}
  return { prompt: fallback, prompt_id: null, variant_label: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const supa = createClient(supaUrl, serviceKey);

  let orderId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    orderId = body?.order_id ?? null;
    if (!orderId) {
      return new Response(JSON.stringify({ ok: false, error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: oErr } = await supa
      .from("orders")
      .select("id, order_code, user_id, total, shipping_name")
      .eq("id", orderId)
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "order not found");

    // SECURITY: only the order owner, an admin, or a service-role caller may
    // trigger this email. Prevents spam/harassment of arbitrary customers.
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let authorized = token === serviceKey;
    if (!authorized && token) {
      const { data: claimsData } = await supa.auth.getClaims(token);
      const uid = claimsData?.claims?.sub as string | undefined;
      if (uid) {
        if (uid === order.user_id) authorized = true;
        else {
          const { data: isAdmin } = await supa.rpc("has_role", { _user_id: uid, _role: "admin" });
          if (isAdmin) authorized = true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supa
      .from("order_items")
      .select("product_slug, product_name, product_image, variant, quantity, unit_price")
      .eq("order_id", orderId);

    const { data: profile } = await supa
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();

    const recipient = profile?.email;
    if (!recipient) {
      return new Response(JSON.stringify({ ok: false, error: "no recipient email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const purchasedSlugs = new Set((items ?? []).map((i: any) => i.product_slug));
    const { data: catalog } = await supa
      .from("products")
      .select("slug, name, category, price, sale_price, main_image, approval_status, is_active")
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .limit(120);

    const slimCatalog = (catalog ?? [])
      .filter((p: any) => !purchasedSlugs.has(p.slug))
      .slice(0, 80)
      .map((p: any) => ({
        slug: p.slug,
        name: p.name,
        category: p.category ?? null,
        price: p.sale_price ?? p.price ?? null,
        image: p.main_image ?? null,
      }));

    // AI step
    let thankYou = "Gracias por tu pedido. Lo estamos preparando con cuidado.";
    let picks: Array<{ slug: string; name: string; reason: string; price: number | null; image: string | null }> = [];
    let reorderDays: number | null = 30;
    let aiPromptId: string | null = null;
    let aiVariant: string | null = null;
    let source = "heuristic";

    if (apiKey && slimCatalog.length) {
      const defaultSystem = `Eres el asistente post-compra de Nutribatidos.
Devuelve un JSON: {"thank_you":"...","picks":[{"slug":"...","reason":"..."}],"reorder_days": 30}
- thank_you: español, cálido, máx 22 palabras, sin emojis.
- picks: hasta 3 productos del catálogo que complementen lo comprado, no duplicados, slugs válidos, reason ≤ 6 palabras.
- reorder_days: entero estimado de días que durarán los consumibles, o null.`;
      const { prompt: system, prompt_id, variant_label } = await getActivePrompt(supa, "ai-post-purchase", defaultSystem);
      aiPromptId = prompt_id;
      aiVariant = variant_label;

      const user = JSON.stringify({
        order_code: order.order_code,
        items: (items ?? []).map((i: any) => ({
          slug: i.product_slug, name: i.product_name, quantity: i.quantity,
        })),
        catalog: slimCatalog.map((p) => ({
          slug: p.slug, name: p.name, category: p.category, price: p.price,
        })),
        max: 3,
      });

      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            response_format: { type: "json_object" },
            temperature: 0.4,
          }),
        });
        if (r.ok) {
          const data = await r.json();
          const parsed = parseJsonLoose(data?.choices?.[0]?.message?.content ?? "") ?? {};
          const validBySlug = new Map(slimCatalog.map((p) => [p.slug, p]));
          const rawPicks = Array.isArray(parsed?.picks) ? parsed.picks : [];
          picks = rawPicks
            .filter((p: any) => p && typeof p.slug === "string" && validBySlug.has(p.slug))
            .slice(0, 3)
            .map((p: any) => {
              const cat = validBySlug.get(p.slug)!;
              return {
                slug: p.slug,
                name: cat.name,
                reason: (typeof p.reason === "string" ? p.reason.trim() : "Próximo paso recomendado").slice(0, 60),
                price: cat.price ?? null,
                image: cat.image ?? null,
              };
            });
          if (typeof parsed?.thank_you === "string" && parsed.thank_you.trim()) {
            thankYou = parsed.thank_you.trim().slice(0, 240);
          }
          if (Number.isFinite(parsed?.reorder_days)) {
            reorderDays = Math.max(7, Math.min(120, Math.round(parsed.reorder_days)));
          }
          source = picks.length ? "ai" : "heuristic";
        }
      } catch (_) {}
    }

    // Fallback heuristic picks
    if (!picks.length) {
      const purchasedCats = new Set(
        (items ?? []).map((i: any) => {
          const p = (catalog ?? []).find((c: any) => c.slug === i.product_slug);
          return (p?.category ?? "").toLowerCase();
        }).filter(Boolean),
      );
      picks = slimCatalog
        .map((p) => ({
          p,
          score: purchasedCats.has((p.category ?? "").toLowerCase()) ? 3 : 1,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ p }) => ({
          slug: p.slug, name: p.name,
          reason: "Complementa tu compra",
          price: p.price ?? null, image: p.image ?? null,
        }));
    }

    const customerName = (profile?.full_name || order.shipping_name || "").split(" ")[0] || "";
    const orderUrl = `https://ignite-peak-co.lovable.app/my-orders/${order.id}`;

    const templateData = {
      customerName,
      orderCode: order.order_code,
      total: Number(order.total ?? 0),
      currency: "PEN",
      items: (items ?? []).map((i: any) => ({
        name: i.product_name,
        variant: i.variant,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        image: i.product_image,
      })),
      thankYou,
      picks,
      reorderDays,
      orderUrl,
    };

    const idempotencyKey = `order-confirm-${order.id}`;

    const { data: sendRes, error: sendErr } = await supa.functions.invoke("send-transactional-email", {
      body: {
        templateName: "order-confirmation-ai",
        recipientEmail: recipient,
        idempotencyKey,
        templateData,
      },
    });

    const status = sendErr ? "failed" : "sent";
    await supa.from("ai_email_log").insert({
      order_id: order.id,
      order_code: order.order_code,
      recipient_email: recipient,
      email_type: "order_confirmation_ai",
      template_name: "order-confirmation-ai",
      ai_picks: picks,
      ai_thank_you: thankYou,
      ai_prompt_id: aiPromptId,
      ai_variant: aiVariant,
      source,
      status,
      error: sendErr ? String(sendErr.message ?? sendErr) : null,
    });

    return new Response(JSON.stringify({ ok: !sendErr, send: sendRes ?? null, source, picks: picks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    try {
      if (orderId) {
        await supa.from("ai_email_log").insert({
          order_id: orderId,
          email_type: "order_confirmation_ai",
          recipient_email: "",
          status: "failed",
          error: msg,
        });
      }
    } catch (_) {}
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
