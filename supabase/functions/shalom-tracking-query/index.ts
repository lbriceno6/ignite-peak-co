// Shalom Wrapper — tracking query edge function.
//
// Flujo: el admin (o el dueño del pedido) llama esta función con
// { order_id, tracking_number?, tracking_code?, ose_id? }.
// La función:
//   1. Verifica que el caller sea admin o dueño del pedido.
//   2. Hace login a Shalom Pro (cache en memoria).
//   3. Consulta tracking en Shalom (con endpoints configurables).
//   4. Mapea eventos a status interno.
//   5. Upsert en public.order_shipments. Si la API falla mantiene
//      el último estado guardado y solo escribe error_message.
//
// Credenciales (NUNCA expuestas al frontend):
//   - SHALOM_USER, SHALOM_PASSWORD: login Shalom Pro
//   - SHALOM_WRAPPER_API_KEY: opcional, para validar invocaciones server-to-server
//
// Endpoints configurables (opcionales, valores por defecto best-effort):
//   - SHALOM_BASE_URL          (default: https://shalom.com.pe)
//   - SHALOM_LOGIN_PATH        (default: /api/auth/login)
//   - SHALOM_TRACKING_PATH     (default: /api/tracking)
//   - SHALOM_TRACKING_BY_OSE   (default: /api/tracking/{ose_id}/events)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SHALOM_BASE = Deno.env.get("SHALOM_BASE_URL") ?? "https://shalom.com.pe";
const SHALOM_LOGIN_PATH = Deno.env.get("SHALOM_LOGIN_PATH") ?? "/api/auth/login";
const SHALOM_TRACKING_PATH = Deno.env.get("SHALOM_TRACKING_PATH") ?? "/api/tracking";
const SHALOM_TRACKING_BY_OSE = Deno.env.get("SHALOM_TRACKING_BY_OSE") ?? "/api/tracking/{ose_id}/events";

// In-memory session cache (per warm instance).
let cachedSession: { token: string; cookie: string | null; expiresAt: number } | null = null;

type Event = { title?: string; description?: string; date?: string; time?: string; location?: string };

const mapStatus = (events: Event[], delivered?: boolean) => {
  if (delivered) return "entregado";
  if (!events || events.length === 0) return "preparando";
  const text = events.map((e) => `${e.title ?? ""} ${e.description ?? ""}`.toLowerCase()).join(" || ");
  const has = (...n: string[]) => n.some((x) => text.includes(x));
  if (has("entregado", "delivered")) return "entregado";
  if (has("reparto", "para entrega", "out for delivery")) return "reparto";
  if (has("en destino", "agencia destino", "arribó", "arribo a destino")) return "destino";
  if (has("demora", "retraso", "rezagado")) return "demora";
  if (has("tránsito", "transito", "in transit", "en ruta")) return "transito";
  if (has("origen", "recepcionado", "recibido en agencia", "en origen")) return "origen";
  return "preparando";
};

async function shalomLogin(): Promise<{ token: string; cookie: string | null }> {
  const now = Date.now();
  if (cachedSession && cachedSession.expiresAt > now + 30_000) {
    return { token: cachedSession.token, cookie: cachedSession.cookie };
  }
  const user = Deno.env.get("SHALOM_USER");
  const pass = Deno.env.get("SHALOM_PASSWORD");
  if (!user || !pass) throw new Error("missing_shalom_credentials");

  const res = await fetch(`${SHALOM_BASE}${SHALOM_LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: user, username: user, password: pass }),
  });
  const cookie = res.headers.get("set-cookie");
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { /* not json */ }
  if (!res.ok) throw new Error(`shalom_login_failed:${res.status}:${text.slice(0, 200)}`);

  const token = body?.token ?? body?.access_token ?? body?.data?.token ?? "";
  cachedSession = { token, cookie, expiresAt: now + 30 * 60 * 1000 };
  return { token, cookie };
}

async function shalomFetch(path: string): Promise<any> {
  const { token, cookie } = await shalomLogin();
  const headers: Record<string, string> = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${SHALOM_BASE}${path}`, { headers });
  if (res.status === 401 || res.status === 403) {
    // session may have expired
    cachedSession = null;
    const retry = await shalomLogin();
    const h2: Record<string, string> = { "Accept": "application/json" };
    if (retry.token) h2["Authorization"] = `Bearer ${retry.token}`;
    if (retry.cookie) h2["Cookie"] = retry.cookie;
    const r2 = await fetch(`${SHALOM_BASE}${path}`, { headers: h2 });
    const t2 = await r2.text();
    if (!r2.ok) throw new Error(`shalom_fetch_failed:${r2.status}:${t2.slice(0, 200)}`);
    try { return JSON.parse(t2); } catch { return { raw: t2 }; }
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`shalom_fetch_failed:${res.status}:${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function normalize(raw: any): {
  events: Event[];
  ose_id: string | null;
  origin: string | null;
  destination: string | null;
  delivered: boolean;
  registered_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
} {
  const data = raw?.data ?? raw ?? {};
  const eventsRaw: any[] = data.events ?? data.movimientos ?? data.history ?? data.eventos ?? [];
  const events: Event[] = eventsRaw.map((e: any) => ({
    title: e.title ?? e.titulo ?? e.estado ?? e.status,
    description: e.description ?? e.descripcion ?? e.detalle ?? e.observacion,
    date: e.date ?? e.fecha,
    time: e.time ?? e.hora,
    location: e.location ?? e.ubicacion ?? e.agencia,
  }));
  return {
    events,
    ose_id: data.ose_id ?? data.oseId ?? data.id ?? null,
    origin: data.origen ?? data.origin ?? data.agencia_origen ?? null,
    destination: data.destino ?? data.destination ?? data.agencia_destino ?? null,
    delivered: Boolean(data.entregado ?? data.delivered),
    registered_at: data.fecha_registro ?? data.registered_at ?? null,
    estimated_delivery_at: data.fecha_estimada ?? data.estimated_delivery_at ?? null,
    delivered_at: data.fecha_entrega ?? data.delivered_at ?? null,
  };
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

    // AuthZ: either valid user (admin or order owner) OR server-to-server wrapper key
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub ?? null;
    }
    const isWrapper = expectedKey && wrapperKey === expectedKey;

    if (!userId && !isWrapper) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, tracking_number, tracking_code, ose_id } = body ?? {};
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller owns order or is admin (skip when wrapper key used)
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

    // Load existing shipment to keep last state on failure
    const { data: existing } = await admin.from("order_shipments").select("*").eq("order_id", order_id).maybeSingle();
    const effectiveOse = ose_id ?? existing?.ose_id ?? null;
    const effectiveNumber = tracking_number ?? existing?.tracking_number ?? null;
    const effectiveCode = tracking_code ?? existing?.tracking_code ?? null;

    let raw: any = null;
    let errorMessage: string | null = null;

    try {
      if (effectiveOse) {
        raw = await shalomFetch(SHALOM_TRACKING_BY_OSE.replace("{ose_id}", encodeURIComponent(effectiveOse)));
      } else if (effectiveNumber) {
        const qs = new URLSearchParams();
        qs.set("numero", effectiveNumber);
        if (effectiveCode) qs.set("codigo", effectiveCode);
        raw = await shalomFetch(`${SHALOM_TRACKING_PATH}?${qs.toString()}`);
      } else {
        errorMessage = "missing_tracking_input";
      }
    } catch (e: any) {
      errorMessage = String(e?.message ?? e).slice(0, 500);
    }

    const now = new Date().toISOString();
    let upsertPayload: Record<string, unknown> = {
      order_id,
      carrier_code: "shalom",
      tracking_number: effectiveNumber,
      tracking_code: effectiveCode,
      ose_id: effectiveOse,
      last_checked_at: now,
      error_message: errorMessage,
    };

    if (raw && !errorMessage) {
      const n = normalize(raw);
      const status_internal = mapStatus(n.events, n.delivered);
      const last = n.events[0];
      upsertPayload = {
        ...upsertPayload,
        ose_id: n.ose_id ?? effectiveOse,
        status_internal,
        status_external: last?.title ?? null,
        origin_name: n.origin,
        destination_name: n.destination,
        registered_at: n.registered_at,
        estimated_delivery_at: n.estimated_delivery_at,
        delivered_at: n.delivered_at ?? (status_internal === "entregado" ? now : null),
        last_event_title: last?.title ?? null,
        last_event_description: last?.description ?? null,
        last_event_date: last?.date ?? null,
        last_event_time: last?.time ?? null,
        history_json: n.events,
        raw_response: raw,
        error_message: null,
      };
    }

    // Look up carrier_id for shalom (best-effort)
    if (!existing?.carrier_id) {
      const { data: carrier } = await admin.from("shipping_providers").select("id").eq("code", "shalom").maybeSingle();
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
    console.error("shalom-tracking-query error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
