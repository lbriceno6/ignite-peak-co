// Edge function: crm-ai — asistente IA del CRM (solo admin).
// Acciones: summary | intent | recommend | whatsapp | next_action | coupon.
// Usa el provider configurado (DeepSeek por defecto si hay key, sino Lovable AI).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { callAI, getProviderConfig, type AIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Eres el asistente CRM de Nutribatidos (tienda peruana de suplementos).
Responde SIEMPRE en español y SIEMPRE en JSON estricto válido (sin markdown, sin texto extra).
Reglas:
- No inventes pedidos, productos ni datos del cliente: solo razona con los datos provistos.
- Sin afirmaciones médicas. Usa frases suaves como "puede ayudar a complementar".
- Moneda S/ (PEN).
- Tono cercano, profesional, breve.`;

const SCHEMAS: Record<string, string> = {
  summary:     `{"resumen": string, "tags": string[]}`,
  intent:      `{"intencion": string, "confianza": number, "señales": string[]}`,
  recommend:   `{"productos": [{"nombre": string, "motivo": string}]}`,
  whatsapp:    `{"mensaje": string}`,
  next_action: `{"accion": string, "detalle": string, "cuando": string}`,
  coupon:      `{"codigo": string, "descuento_pct": number, "motivo": string, "mensaje": string}`,
};

function pickProvider(requested?: string): AIProvider {
  const order: AIProvider[] = requested && ["deepseek", "lovable", "openai", "gemini", "anthropic"].includes(requested)
    ? [requested as AIProvider, "deepseek", "lovable", "openai"]
    : ["deepseek", "lovable", "openai"];
  for (const p of order) {
    if (getProviderConfig(p).hasKey) return p;
  }
  return "lovable";
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
    const { action, customer, catalog, provider: reqProvider } = body || {};
    if (!action || !SCHEMAS[action]) return json({ error: "invalid action" }, 400);
    if (!customer) return json({ error: "customer required" }, 400);

    const provider = pickProvider(reqProvider);
    console.log(`[crm-ai] action=${action} provider=${provider}`);

    const userPrompt = `Acción: ${action}
Cliente: ${JSON.stringify(customer)}
Catálogo de referencia (nombres de productos comprados): ${JSON.stringify((catalog || []).slice(0, 30))}

Responde ÚNICAMENTE con un JSON con este schema: ${SCHEMAS[action]}`;

    try {
      const ai = await callAI({
        provider,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 800,
        jsonMode: true,
      });
      let parsed: any;
      try { parsed = JSON.parse(ai.content); } catch { parsed = { raw: ai.content }; }
      return json({ action, provider, model: ai.model, result: parsed });
    } catch (aiErr: any) {
      const msg = String(aiErr?.message || aiErr);
      console.error("[crm-ai] AI error:", msg);
      return json({ error: msg, provider }, 502);
    }
  } catch (e: any) {
    console.error("[crm-ai] fatal:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
