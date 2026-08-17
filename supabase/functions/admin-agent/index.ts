// Edge function: admin-agent — agente IA de administración (solo admin).
//
// Coordinador: recibe el mensaje del administrador, elige el dominio que
// corresponde y delega en su especialista. Cada especialista tiene sus propias
// herramientas y su propio system prompt; el coordinador solo ve una
// herramienta por dominio, así que su lista se mantiene corta aunque crezca el
// número de dominios.
//
// Los dominios viven en `_shared/agent/domains/` y se registran en
// `_shared/agent/registry.ts`. Hoy solo está `catalogo`.
//
// Toda acción respeta RLS (se usa el token del admin) y queda registrada en
// `admin_agent_log` con la tabla y la fila afectadas.
//
// Proveedor de IA: se resuelve en `_shared/ai-tools.ts` a partir de las claves
// disponibles. Se puede fijar con los secretos AGENT_PROVIDER y AGENT_MODEL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { type AgentMessage } from "../_shared/ai-tools.ts";
import { missingProviderMessage, resolveAgentProvider } from "../_shared/ai-tools.ts";
import { runToolLoop } from "../_shared/agent/runner.ts";
import { buildCoordinatorTools, SYSTEM_COORDINATOR } from "../_shared/agent/registry.ts";
import type { AgentAction, AgentContext, AuditEntry } from "../_shared/agent/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "no auth" }, 401);

    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { message, history, session_id, provider: reqProvider, image_url } = body || {};
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);

    const attachedImageUrl: string | null =
      typeof image_url === "string" && image_url ? image_url : null;

    const picked = resolveAgentProvider(reqProvider);
    if (!picked) return json({ error: missingProviderMessage() }, 400);
    const { provider, model } = picked;

    // Service-role solo para subir imágenes a Storage (bypass de RLS acotado).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    const userId = userData.user.id;
    const audit = async (entry: AuditEntry) => {
      try {
        await supabase.from("admin_agent_log").insert({
          user_id: userId,
          session_id: session_id ?? null,
          provider,
          model,
          ...entry,
        });
      } catch (_) {
        // El registro nunca debe romper la conversación.
      }
    };

    const actions: AgentAction[] = [];
    const ctx: AgentContext = {
      supabase,
      service,
      authHeader,
      supabaseUrl,
      anonKey: anon,
      attachedImageUrl,
      actions,
      audit,
    };

    // Historial reciente: solo turnos de texto, para no reenviar herramientas
    // de conversaciones anteriores.
    const recent: AgentMessage[] = (Array.isArray(history) ? history.slice(-12) : [])
      .filter((m: any) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .map((m: any) => ({ role: m.role, content: m.content }));

    const userMessage = attachedImageUrl
      ? `${message}\n\n[IMAGEN_ADJUNTA disponible: el usuario adjuntó una imagen. Menciónalo al delegar en el especialista.]`
      : message;

    await audit({ role: "user", content: message });

    const specialistUsage = { tokensIn: 0, tokensOut: 0 };
    const tools = buildCoordinatorTools({ provider, model, usage: specialistUsage });

    const start = Date.now();
    const res = await runToolLoop({
      provider,
      model,
      system: SYSTEM_COORDINATOR,
      history: recent,
      message: userMessage,
      tools,
      ctx,
      maxRounds: 6,
    });
    const latency_ms = Date.now() - start;

    const tokensIn = res.tokensIn + specialistUsage.tokensIn;
    const tokensOut = res.tokensOut + specialistUsage.tokensOut;

    const reply = res.text ||
      (actions.length
        ? "Listo, apliqué los cambios solicitados."
        : "No pude completar la solicitud. ¿Puedes darme más detalles?");

    await audit({
      role: "assistant",
      content: reply,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms,
    });

    return json({
      reply,
      actions,
      provider,
      model,
      tokens: { input: tokensIn, output: tokensOut },
      latency_ms,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error("[admin-agent] fatal:", e);

    // `normalizeAIError` ya traduce los fallos de proveedor a mensajes
    // accionables; se devuelven como 502 para distinguirlos de un fallo nuestro.
    const isProviderError = /Rate limit|Credenciales inválidas|Sin créditos|respondió \d{3}/i
      .test(msg);
    return json({ error: msg }, isProviderError ? 502 : 500);
  }
});
