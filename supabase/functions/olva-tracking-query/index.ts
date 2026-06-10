// Olva Express — public tracking query.
//
// Endpoint:
//   GET https://reports.olvaexpress.pe/webservice/rest/getTrackingInformation
//     ?tracking=<remito>&emision=<emision>&apikey=<key>&details=1
//
// Input: { order_id, tracking_number (=remito), tracking_code (=emision) }
// AuthZ: caller must be admin / order owner, OR pass x-wrapper-key = SHALOM_WRAPPER_API_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OLVA_API = "https://reports.olvaexpress.pe/webservice/rest/getTrackingInformation";
// Public API key shipped in tracking.olvaexpress.pe front-end.
const OLVA_APIKEY = "a82e5d192fae9bbfee43a964024498e87dfecb884b67c7e95865a3bb07b607dd";

const HEADERS = {
  "Origin": "https://tracking.olvaexpress.pe",
  "Referer": "https://tracking.olvaexpress.pe/",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
};

type Event = { title?: string; description?: string; date?: string; time?: string; location?: string };

function splitDateTime(s?: string | null): { date?: string; time?: string } {
  if (!s) return {};
  const t = String(s).trim();
  if (t.includes(" ")) {
    const [d, h] = t.split(" ");
    return { date: d, time: h };
  }
  return { date: t };
}

function mapStatus(estado: string | null | undefined): string {
  const s = String(estado ?? "").toUpperCase();
  if (!s) return "preparando";
  if (s.includes("ENTREGADO")) return "entregado";
  if (s.includes("ANULADO") || s.includes("CANCEL")) return "cancelado";
  if (s.includes("DEVOLU") || s.includes("RECHAZ")) return "devuelto";
  if (s.includes("ASIGNADO") || s.includes("RUTA") || s.includes("REPARTO") || s.includes("MOTORIZADO")) return "reparto";
  if (s.includes("DESPACHO") || s.includes("TRANSITO") || s.includes("TRÁNSITO")) return "transito";
  if (s.includes("RECEPCION") || s.includes("RECEPCIÓN")) return "origen";
  if (s.includes("REGISTRADO")) return "preparando";
  return "transito";
}

async function fetchOlva(tracking: string, emision: string): Promise<any> {
  const url = `${OLVA_API}?tracking=${encodeURIComponent(tracking)}&emision=${encodeURIComponent(emision)}&apikey=${OLVA_APIKEY}&details=1`;
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  if (!res.ok) throw new Error(`olva_http_${res.status}:${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { throw new Error("olva_non_json"); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const wrapperKey = req.headers.get("x-wrapper-key");
    const expectedKey = Deno.env.get("SHALOM_WRAPPER_API_KEY");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined,
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub ?? null;
    }
    const isWrapper = !!expectedKey && wrapperKey === expectedKey;

    if (!userId && !isWrapper) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, tracking_number, tracking_code } = body ?? {};
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isWrapper) {
      const { data: order } = await admin.from("orders").select("user_id").eq("id", order_id).maybeSingle();
      if (!order) {
        return new Response(JSON.stringify({ error: "order_not_found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const isAdmin = !!roleRow;
      if (!isAdmin && order.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: existing } = await admin
      .from("order_shipments").select("*").eq("order_id", order_id).maybeSingle();

    const effectiveNumber = (tracking_number ?? existing?.tracking_number ?? "").toString().trim();
    const effectiveCode = (tracking_code ?? existing?.tracking_code ?? "").toString().trim();

    let response: any = null;
    let errorMessage: string | null = null;

    if (!effectiveNumber || !effectiveCode) {
      errorMessage = "missing_tracking_input: se requieren remito (tracking) y emision (código).";
    } else {
      try {
        response = await fetchOlva(effectiveNumber, effectiveCode);
        if (response?.success === false) errorMessage = String(response?.msg ?? "olva_failed");
      } catch (e: any) {
        errorMessage = String(e?.message ?? e).slice(0, 500);
      }
    }

    const now = new Date().toISOString();
    let upsertPayload: Record<string, unknown> = {
      order_id,
      carrier_code: "olva",
      tracking_number: effectiveNumber || null,
      tracking_code: effectiveCode || null,
      ose_id: null,
      last_checked_at: now,
      error_message: errorMessage,
    };

    if (response?.success && !errorMessage) {
      const data = response.data ?? {};
      const general = data.general ?? {};
      const details: any[] = Array.isArray(data.details) ? data.details : [];

      // details come newest-first already
      const events: Event[] = details.map((d) => {
        const { date, time } = splitDateTime(d.fecha_creacion);
        return {
          title: d.estado_tracking,
          description: d.obs,
          location: d.nombre_sede,
          date, time,
        };
      });
      const last = events[0];
      const status_internal = mapStatus(general.nombre_estado_tracking ?? last?.title);
      const delivered = status_internal === "entregado";

      // Try to extract delivered_at from latest ENTREGADO detail
      const entregadoEvt = details.find((d) => String(d.estado_tracking).toUpperCase().includes("ENTREGADO"));
      const deliveredAt = entregadoEvt?.fecha_creacion ?? null;

      upsertPayload = {
        ...upsertPayload,
        status_internal,
        status_external: general.nombre_estado_tracking ?? last?.title ?? null,
        origin_name: general.origen ?? null,
        destination_name: general.destino ?? null,
        registered_at: general.fecha_emision_fresh ?? general.fecha_envio ?? null,
        estimated_delivery_at: null,
        delivered_at: deliveredAt ?? (delivered ? now : null),
        last_event_title: last?.title ?? null,
        last_event_description: last?.description ?? null,
        last_event_date: last?.date ?? null,
        last_event_time: last?.time ?? null,
        history_json: events,
        raw_response: response,
        error_message: null,
      };
    }

    if (!existing?.carrier_id) {
      const { data: carrier } = await admin.from("shipping_providers").select("id").eq("code", "olva").maybeSingle();
      if (carrier?.id) upsertPayload.carrier_id = carrier.id;
    }

    const { data: saved, error } = await admin
      .from("order_shipments")
      .upsert(upsertPayload, { onConflict: "order_id" })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ shipment: saved, warning: errorMessage }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("olva-tracking-query error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
