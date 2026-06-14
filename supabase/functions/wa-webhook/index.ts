// Edge function: wa-webhook — recibe eventos de WhatsApp Cloud API (Meta).
//
// GET  -> verificación del webhook (hub.challenge).
// POST -> mensajes entrantes + callbacks de estado (sent/delivered/read/failed).
//
// Seguridad: valida X-Hub-Signature-256 (HMAC-SHA256 con WHATSAPP_APP_SECRET).
// Ingesta vía RPC única wa_ingest_inbound() (mismo camino que el bridge QR).
// Media: resuelve el id de Meta -> descarga -> sube a Storage (bucket wa-media).
// verify_jwt = false en config.toml.
//
// Secrets:
//   WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_TOKEN
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (inyectados)
//   FERNANDA_WEBHOOK_URL (opcional), MEDIA_BUCKET (default wa-media)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const APP_SECRET   = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const TOKEN        = Deno.env.get("WHATSAPP_TOKEN") || "";
const FERNANDA_URL = Deno.env.get("FERNANDA_WEBHOOK_URL") || "";
const MEDIA_BUCKET = Deno.env.get("MEDIA_BUCKET") || "wa-media";
const GRAPH_VERSION = "v21.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- firma HMAC ----------
async function validSignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET) return true;            // sin secret no bloquea (solo dev)
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expected = `sha256=${hex}`;
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

// ---------- parse tipo + texto ----------
function parseMessage(msg: any): { type: string; body: string | null } {
  switch (msg.type) {
    case "text":        return { type: "text", body: msg.text?.body ?? null };
    case "button":      return { type: "text", body: msg.button?.text ?? null };
    case "interactive": return { type: "text", body: msg.interactive?.button_reply?.title
                                              ?? msg.interactive?.list_reply?.title ?? null };
    case "image":       return { type: "image", body: msg.image?.caption ?? null };
    case "audio":       return { type: "audio", body: null };
    case "video":       return { type: "video", body: msg.video?.caption ?? null };
    case "document":    return { type: "document", body: msg.document?.filename ?? null };
    case "sticker":     return { type: "sticker", body: null };
    case "location":    return { type: "location",
                                 body: `${msg.location?.latitude},${msg.location?.longitude}` };
    default:            return { type: msg.type || "unknown", body: null };
  }
}

// ---------- M3: resolver media de Cloud -> Storage ----------
async function resolveMedia(mediaId: string, waId: string): Promise<{ url: string | null; mime: string | null }> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const meta = await metaRes.json();
    if (!meta?.url) return { url: null, mime: null };
    const bin = await fetch(meta.url, { headers: { Authorization: `Bearer ${TOKEN}` } })
      .then((r) => r.arrayBuffer());
    const ext = (meta.mime_type?.split("/")[1] || "bin").split(";")[0];
    const path = `${waId}/${mediaId}.${ext}`;
    const { error } = await admin.storage.from(MEDIA_BUCKET)
      .upload(path, new Uint8Array(bin), { contentType: meta.mime_type, upsert: true });
    if (error) { console.error("[wa-webhook] media upload", error.message); return { url: null, mime: null }; }
    const { data } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return { url: data?.publicUrl || null, mime: meta.mime_type || null };
  } catch (e) {
    console.error("[wa-webhook] resolveMedia", e);
    return { url: null, mime: null };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // GET: verificación
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new Response("bad signature", { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const names: Record<string, string> = {};
        for (const c of value.contacts ?? []) names[c.wa_id] = c.profile?.name ?? null;

        // entrantes
        for (const msg of value.messages ?? []) {
          const waId = msg.from;
          const name = names[waId] ?? null;
          const { type, body } = parseMessage(msg);

          const mediaId = msg.image?.id || msg.audio?.id || msg.video?.id
                        || msg.document?.id || msg.sticker?.id || null;
          const media = mediaId ? await resolveMedia(mediaId, waId) : { url: null, mime: null };

          const { data: convId, error } = await admin.rpc("wa_ingest_inbound", {
            p_channel: "cloud",
            p_wa_id: waId,
            p_name: name,
            p_wa_message_id: msg.id,
            p_type: type,
            p_body: body,
            p_media_url: media.url,
            p_media_mime: media.mime,
            p_raw: msg,
          });
          if (error) console.error("[wa-webhook] ingest", error.message);

          if (FERNANDA_URL) {
            fetch(FERNANDA_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wa_id: waId, name, type, body, conversation_id: convId, raw: msg }),
            }).catch((e) => console.error("[wa-webhook] fernanda", e));
          }
        }

        // estados
        for (const st of value.statuses ?? []) {
          const map: Record<string, string> = { sent: "sent", delivered: "delivered", read: "read", failed: "failed" };
          const newStatus = map[st.status];
          if (!newStatus) continue;
          await admin.from("wa_messages")
            .update({ status: newStatus, error: st.errors?.[0]?.title ?? null })
            .eq("channel", "cloud").eq("wa_message_id", st.id);
        }
      }
    }
  } catch (e) {
    console.error("[wa-webhook] handler", e);
  }
  return new Response("ok", { status: 200 });
});
