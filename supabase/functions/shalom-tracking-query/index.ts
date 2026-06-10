// Shalom Wrapper — tracking query edge function.
//
// Uses the public tracking endpoints from shalom.com.pe/rastrea (no login required).
// Responses come AES-encrypted (CryptoJS OpenSSL format, passphrase ".Ov3rsku112024l4r43l.")
// and are decrypted server-side.
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
const AES_PASSPHRASE = ".Ov3rsku112024l4r43l.";

// ---------- AES (CryptoJS / OpenSSL "Salted__" compatible) ----------

async function md5(bytes: Uint8Array): Promise<Uint8Array> {
  // Deno doesn't expose md5 via SubtleCrypto. Minimal MD5 impl.
  // Source: public-domain compact implementation.
  const s: number[] = [];
  const k: number[] = [];
  for (let i = 0; i < 64; i++) {
    k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    s[i] = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][((i >>> 4) << 2) | (i & 3)];
  }
  function add32(a: number, b: number) { return (a + b) & 0xffffffff; }
  function leftRotate(x: number, c: number) { return (x << c) | (x >>> (32 - c)); }
  const msg = new Uint8Array(((bytes.length + 8) >>> 6) * 64 + 64);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const bitLen = bytes.length * 8;
  const view = new DataView(msg.buffer);
  view.setUint32(msg.length - 8, bitLen >>> 0, true);
  view.setUint32(msg.length - 4, Math.floor(bitLen / 4294967296), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let chunk = 0; chunk < msg.length; chunk += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) M.push(view.getUint32(chunk + j * 4, true));
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F = 0, g = 0;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = add32(add32(add32(F, A), k[i]), M[g]);
      A = D; D = C; C = B; B = add32(B, leftRotate(F, s[i]));
    }
    a0 = add32(a0, A); b0 = add32(b0, B); c0 = add32(c0, C); d0 = add32(d0, D);
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true); ov.setUint32(4, b0, true);
  ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return out;
}

// EVP_BytesToKey with MD5 (matches OpenSSL "enc" + CryptoJS default)
async function evpKDF(passphrase: Uint8Array, salt: Uint8Array, keyLen = 32, ivLen = 16): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  const target = keyLen + ivLen;
  const out = new Uint8Array(target);
  let prev = new Uint8Array(0);
  let offset = 0;
  while (offset < target) {
    const buf = new Uint8Array(prev.length + passphrase.length + salt.length);
    buf.set(prev, 0);
    buf.set(passphrase, prev.length);
    buf.set(salt, prev.length + passphrase.length);
    prev = await md5(buf);
    out.set(prev.subarray(0, Math.min(prev.length, target - offset)), offset);
    offset += prev.length;
  }
  return { key: out.subarray(0, keyLen), iv: out.subarray(keyLen, keyLen + ivLen) };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function decryptCryptoJSAES(b64: string, passphrase: string): Promise<string> {
  const data = b64ToBytes(b64);
  // OpenSSL format: "Salted__" + 8-byte salt + ciphertext
  const header = new TextDecoder().decode(data.subarray(0, 8));
  if (header !== "Salted__") throw new Error("invalid_cryptojs_payload");
  const salt = data.subarray(8, 16);
  const ct = data.subarray(16);
  const { key, iv } = await evpKDF(new TextEncoder().encode(passphrase), salt, 32, 16);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ct);
  return new TextDecoder().decode(plain);
}

// ---------- Shalom API ----------

async function shalomPostMultipart(path: string, fields: Record<string, string>): Promise<unknown> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v ?? "");
  const res = await fetch(`${SHALOM_API}${path}`, { method: "POST", body: fd });
  const text = await res.text();
  if (!res.ok) throw new Error(`shalom_http_${res.status}:${text.slice(0, 200)}`);
  let body: any;
  try { body = JSON.parse(text); } catch { throw new Error("shalom_non_json"); }
  if (body?.encrypted === true && typeof body.data === "string") {
    const plain = await decryptCryptoJSAES(body.data, AES_PASSPHRASE);
    try { return JSON.parse(plain); } catch { return { raw: plain }; }
  }
  return body;
}

// ---------- Status mapping ----------

type Event = { title?: string; description?: string; date?: string; time?: string; location?: string };

const mapStatus = (events: Event[], delivered?: boolean) => {
  if (delivered) return "entregado";
  if (!events || events.length === 0) return "preparando";
  const text = events.map((e) => `${e.title ?? ""} ${e.description ?? ""}`.toLowerCase()).join(" || ");
  const has = (...n: string[]) => n.some((x) => text.includes(x));
  if (has("entregado", "delivered")) return "entregado";
  if (has("reparto", "para entrega", "out for delivery")) return "reparto";
  if (has("en destino", "agencia destino", "arribó", "arribo a destino", "destino")) return "destino";
  if (has("demora", "retraso", "rezagado")) return "demora";
  if (has("tránsito", "transito", "in transit", "en ruta")) return "transito";
  if (has("origen", "recepcionado", "recibido en agencia")) return "origen";
  return "preparando";
};

function normalize(buscar: any, estados: any) {
  // Both responses are arbitrary JSON; we try common field names.
  const search = buscar?.data ?? buscar ?? {};
  const states = estados?.data ?? estados ?? {};
  const eventsRaw: any[] = (Array.isArray(states) ? states : (states.estados ?? states.events ?? states.movimientos ?? [])) || [];
  const events: Event[] = eventsRaw.map((e: any) => ({
    title: e.titulo ?? e.title ?? e.estado ?? e.descripcion_estado,
    description: e.descripcion ?? e.description ?? e.detalle ?? e.observacion,
    date: e.fecha ?? e.date,
    time: e.hora ?? e.time,
    location: e.ubicacion ?? e.location ?? e.agencia,
  }));
  const ose_id = search.ose_id ?? search.oseId ?? search.id ?? states.ose_id ?? null;
  const origin = search.origen ?? search.agencia_origen ?? search.origin ?? null;
  const destination = search.destino ?? search.agencia_destino ?? search.destination ?? null;
  const delivered = Boolean(search.entregado ?? search.delivered);
  return {
    events,
    ose_id: ose_id ? String(ose_id) : null,
    origin,
    destination,
    delivered,
    registered_at: search.fecha_registro ?? search.registered_at ?? null,
    estimated_delivery_at: search.fecha_estimada ?? search.estimated_delivery_at ?? null,
    delivered_at: search.fecha_entrega ?? search.delivered_at ?? null,
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
        // 1) buscar (needs numero + codigo; ose_id optional)
        if (effectiveNumber) {
          buscar = await shalomPostMultipart(BUSCAR_PATH, {
            numero: String(effectiveNumber),
            codigo: String(effectiveCode ?? ""),
            ose_id: effectiveOse ? String(effectiveOse) : "",
          });
          const b = buscar?.data ?? buscar ?? {};
          effectiveOse = b.ose_id ?? b.oseId ?? b.id ?? effectiveOse;
        }
        // 2) estados (needs ose_id)
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
      const status_internal = mapStatus(n.events, n.delivered);
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
