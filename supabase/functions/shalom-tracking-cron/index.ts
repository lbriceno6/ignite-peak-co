// Cron-triggered refresh for active Shalom shipments.
// Protected by header `x-cron-secret` == SHALOM_WRAPPER_API_KEY (or SHALOM_CRON_SECRET).
// Refresh policy:
//   - origen / transito:        cada 6h
//   - destino / reparto / demora: cada 2h
//   - entregado / cancelado / devuelto: skip
//
// Delegates the actual API call to shalom-tracking-query (server-to-server),
// passing the wrapper key so it bypasses user auth.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("SHALOM_CRON_SECRET") ?? Deno.env.get("SHALOM_WRAPPER_API_KEY");
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const SIX_H = 6 * 60 * 60 * 1000;
  const TWO_H = 2 * 60 * 60 * 1000;

  const { data: shipments } = await admin
    .from("order_shipments")
    .select("order_id,status_internal,last_checked_at,tracking_number,tracking_code,ose_id")
    .eq("carrier_code", "shalom")
    .not("status_internal", "in", "(entregado,cancelado,devuelto,sin_tracking)");

  const due = (shipments ?? []).filter((s: any) => {
    if (!s.tracking_number && !s.ose_id) return false;
    const last = s.last_checked_at ? new Date(s.last_checked_at).getTime() : 0;
    const age = now - last;
    if (["destino", "reparto", "demora"].includes(s.status_internal)) return age >= TWO_H;
    return age >= SIX_H; // origen, transito, preparando
  });

  const wrapperKey = Deno.env.get("SHALOM_WRAPPER_API_KEY")!;
  const projectUrl = Deno.env.get("SUPABASE_URL")!;
  const fnUrl = `${projectUrl}/functions/v1/shalom-tracking-query`;

  let ok = 0, fail = 0;
  for (const s of due) {
    try {
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wrapper-key": wrapperKey,
        },
        body: JSON.stringify({
          order_id: s.order_id,
          tracking_number: s.tracking_number,
          tracking_code: s.tracking_code,
          ose_id: s.ose_id,
        }),
      });
      await r.text();
      if (r.ok) ok++; else fail++;
    } catch {
      fail++;
    }
  }

  return new Response(JSON.stringify({ checked: due.length, ok, fail }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
