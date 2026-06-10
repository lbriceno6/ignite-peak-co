// Shalom Wrapper — tracking query edge function.
//
// Uses the public tracking endpoints from shalom.com.pe/rastrea (no login required).
// Responses arrive as { encrypted: true, data: "<base64>" }.
// Cipher: AES-256-CBC, PKCS7. Key is the fixed base64 key shipped in shalom.com.pe's
// front-end bundle. The base64-decoded payload is [IV(16) || ciphertext].
//
// Endpoints:
//   POST https://serviceswebapi.shalomcontrol.com/api/v1/web/rastrea/buscar
//     multipart: numero, codigo, ose_id (ose_id may be empty)
//   POST https://serviceswebapi.shalomcontrol.com/api/v1/web/rastrea/estados
//     multipart: ose_id
//
// Input: { order_id, tracking_number?, tracking_code?, ose_id? }
// AuthZ: caller must be admin / order owner, OR pass x-wrapper-key = SHALOM_WRAPPER_API_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SHALOM_API = "https://serviceswebapi.shalomcontrol.com";
const BUSCAR_PATH = "/api/v1/web/rastrea/buscar";
const ESTADOS_PATH = "/api/v1/web/rastrea/estados";
const AES_KEY_B64 = "uQn/bQ94PXBEfId70zjN+VE1hSU7kh9VBXTOUd68Ssc=";

// ---------- AES-256-CBC (Shalom front-end format) ----------

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = b64ToBytes(AES_KEY_B64);
  cachedKey = await crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, ["decrypt"]);
  return cachedKey;
}

async function decryptShalom(b64: string): Promise<string> {
  const data = b64ToBytes(b64);
  if (data.length < 32) throw new Error("invalid_payload_length");
  const iv = data.subarray(0, 16);
  const ct = data.subarray(16);
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

// ---------- Shalom API ----------

async function shalomPostMultipart(path: string, fields: Record<string, string>): Promise<any> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v ?? "");
  const res = await fetch(`${SHALOM_API}${path}`, {
    method: "POST",
    body: fd,
    headers: {
      "Origin": "https://shalom.com.pe",
      "Referer": "https://shalom.com.pe/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`shalom_http_${res.status}:${text.slice(0, 200)}`);
  let body: any;
  try { body = JSON.parse(text); } catch { throw new Error("shalom_non_json"); }
  if (body?.encrypted === true && typeof body.data === "string") {
    const plain = await decryptShalom(body.data);
    try { return JSON.parse(plain); } catch { return { raw: plain }; }
  }
  return body;
}

// ---------- Normalization ----------

type Event = { title?: string; description?: string; date?: string; time?: string; location?: string };

const STATE_ORDER: Array<{ key: string; title: string }> = [
  { key: "registrado", title: "Registrado" },
  { key: "origen", title: "En origen" },
  { key: "transito", title: "En tránsito" },
  { key: "demora", title: "Demora de envío" },
  { key: "destino", title: "En destino" },
  { key: "reparto", title: "En reparto" },
  { key: "entregado", title: "Entregado" },
];

function splitDateTime(s?: string | null): { date?: string; time?: string } {
  if (!s) return {};
  const [d, t] = String(s).split(" ");
  return { date: d, time: t };
}

function eventsFromEstados(estados: any): Event[] {
  const root = estados?.data ?? estados ?? {};
  const out: Event[] = [];
  for (const { key, title } of STATE_ORDER) {
    const v = root?.[key];
    if (!v || typeof v !== "object") continue;
    const fecha = v.fecha ?? v.date ?? null;
    const { date, time } = splitDateTime(fecha);
    out.push({ title, date, time, description: v.carguero ? `Carguero ${v.carguero}` : undefined });
  }
  // Newest first
  return out.reverse();
}

function mapStatusFromEstados(estados: any, deliveredFlag?: boolean): string {
  if (deliveredFlag) return "entregado";
  const root = estados?.data ?? estados ?? {};
  if (root?.entregado) return "entregado";
  if (root?.reparto) return "reparto";
  if (root?.demora) return "demora";
  if (root?.destino) return "destino";
  if (root?.transito) return "transito";
  if (root?.origen) return "origen";
  if (root?.registrado) return "preparando";
  return "preparando";
}

function normalize(buscar: any, estados: any) {
  const search = buscar?.data ?? buscar ?? {};
  const root = estados?.data ?? estados ?? {};
  const events = eventsFromEstados(estados);
  const ose_id = search.ose_id ?? null;
  const origin =
    (search.origen && (search.origen.nombre ?? search.origen)) ?? null;
  const destination =
    (search.destino && (search.destino.nombre ?? search.destino)) ?? null;
  const delivered = Boolean(search.entregado) || Boolean(root?.entregado);
  return {
    events,
    ose_id: ose_id ? String(ose_id) : null,
    origin,
    destination,
    delivered,
    registered_at: search.fecha_emision ?? search.fecha_traslado ?? root?.registrado?.fecha ?? null,
    estimated_delivery_at: null,
    delivered_at: root?.entregado?.fecha ?? null,
  };
}

// ---------- Edge function ----------

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
    const { order_id, tracking_number, tracking_code, ose_id } = body ?? {};
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

    const { data: existing } = await admin.from("order_shipments").select("*").eq("order_id", order_id).maybeSingle();
    let effectiveOse = ose_id ?? existing?.ose_id ?? null;
    const effectiveNumber = tracking_number ?? existing?.tracking_number ?? null;
    const effectiveCode = tracking_code ?? existing?.tracking_code ?? null;

    let buscar: any = null;
    let estados: any = null;
    let errorMessage: string | null = null;

    try {
      if (!effectiveNumber && !effectiveOse) {
        errorMessage = "missing_tracking_input";
      } else {
        if (effectiveNumber) {
          buscar = await shalomPostMultipart(BUSCAR_PATH, {
            numero: String(effectiveNumber),
            codigo: String(effectiveCode ?? ""),
            ose_id: effectiveOse ? String(effectiveOse) : "",
          });
          const b = buscar?.data ?? buscar ?? {};
          effectiveOse = b.ose_id ?? effectiveOse;
        }
        if (effectiveOse) {
          estados = await shalomPostMultipart(ESTADOS_PATH, { ose_id: String(effectiveOse) });
        }
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
      ose_id: effectiveOse ? String(effectiveOse) : null,
      last_checked_at: now,
      error_message: errorMessage,
    };

    if ((buscar || estados) && !errorMessage) {
      const n = normalize(buscar, estados);
      const status_internal = mapStatusFromEstados(estados, n.delivered);
      const last = n.events[0];
      upsertPayload = {
        ...upsertPayload,
        ose_id: n.ose_id ?? upsertPayload.ose_id,
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
        raw_response: { buscar, estados },
        error_message: null,
      };
    }

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
