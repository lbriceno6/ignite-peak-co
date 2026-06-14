// Edge function: wa-send — envía mensajes salientes (solo admin).
//
// Agnóstico de canal:
//   channel = 'cloud' -> Graph API de Meta
//   channel = 'qr'    -> bridge Baileys (POST {WA_BRIDGE_URL}/send)
//
// Reglas Meta: fuera de la ventana de 24h SOLO se permiten plantillas (type='template').
// Para texto libre fuera de ventana devuelve 409.
//
// Secrets requeridos (canal cloud):
//   WHATSAPP_TOKEN            (token permanente / system user)
//   WHATSAPP_PHONE_NUMBER_ID  (Phone Number ID)
// Opcional (canal qr):
//   WA_BRIDGE_URL, WA_BRIDGE_KEY
//
// verify_jwt = true en config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GRAPH_VERSION = "v21.0"; // ajustable si Meta sube de versión
const TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

// ---------- envío por Cloud API ----------
async function sendCloud(to: string, type: string, text?: string, template?: any) {
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}/messages`;
  const body: any = { messaging_product: "whatsapp", to, type };
  if (type === "text") body.text = { body: text };
  else if (type === "template") body.template = template;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || "error Graph API", wamid: null };
  }
  return { ok: true, error: null, wamid: data?.messages?.[0]?.id ?? null };
}

// ---------- envío por QR (Baileys bridge) ----------
async function sendQr(to: string, text?: string) {
  const url = Deno.env.get("WA_BRIDGE_URL");
  const key = Deno.env.get("WA_BRIDGE_KEY");
  if (!url) {
    return { ok: false, error: "canal qr no configurado (falta WA_BRIDGE_URL)", wamid: null };
  }
  const res = await fetch(`${url}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { "x-bridge-key": key } : {}) },
    body: JSON.stringify({ to, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || "error bridge", wamid: null };
  return { ok: true, error: null, wamid: data?.id ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "no auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) return json({ error: "admin required" }, 403);

    const { conversation_id, type = "text", text, template } = await req.json().catch(() => ({}));
    if (!conversation_id) return json({ error: "conversation_id requerido" }, 400);
    if (type === "text" && !text?.trim()) return json({ error: "texto vacío" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // resolver conversación + contacto + ventana
    const { data: conv } = await admin
      .from("wa_conversations")
      .select("id, channel, contact_id, last_inbound_at, wa_contacts(wa_id)")
      .eq("id", conversation_id).single();
    if (!conv) return json({ error: "conversación no existe" }, 404);

    const waId = (conv as any).wa_contacts?.wa_id;
    const channel = (conv as any).channel || "cloud";

    // ventana de 24h: solo aplica a cloud y a texto libre
    if (channel === "cloud" && type === "text") {
      const lastIn = (conv as any).last_inbound_at
        ? new Date((conv as any).last_inbound_at).getTime() : 0;
      const open = lastIn > Date.now() - 24 * 60 * 60 * 1000;
      if (!open) {
        return json({ error: "ventana_cerrada",
          detail: "Pasaron más de 24h desde el último mensaje del cliente. Solo puedes enviar una plantilla aprobada (type='template')." }, 409);
      }
    }

    // enviar
    const result = channel === "qr"
      ? await sendQr(waId, text)
      : await sendCloud(waId, type, text, template);

    // loguear (siempre, aunque falle, para auditoría)
    await admin.from("wa_messages").insert({
      conversation_id, contact_id: (conv as any).contact_id, channel,
      wa_message_id: result.wamid, direction: "out",
      type, body: type === "text" ? text : `[plantilla]`,
      status: result.ok ? "sent" : "failed",
      error: result.error, sent_by: userData.user.id,
    });

    if (!result.ok) return json({ error: result.error }, 502);

    // al responder, marca la conversación leída
    await admin.from("wa_conversations").update({ unread_count: 0, status: "open" }).eq("id", conversation_id);

    return json({ ok: true, wamid: result.wamid });
  } catch (e) {
    console.error("[wa-send]", e);
    return json({ error: String(e) }, 500);
  }
});
