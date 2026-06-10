// Edge function: crm-ai — asistente IA del CRM (solo admin).
// Acciones: summary | intent | recommend | whatsapp | next_action | coupon.
// No ejecuta SQL ni accede a la BD: razona sobre los datos recibidos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    // Autenticación + verificación de rol admin
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

    const { action, customer, catalog } = await req.json();
    if (!action || !SCHEMAS[action]) return json({ error: "invalid action" }, 400);
    if (!customer) return json({ error: "customer required" }, 400);

    const userPrompt = `Acción: ${action}
Cliente: ${JSON.stringify(customer)}
Catálogo de referencia (nombres de productos comprados): ${JSON.stringify((catalog || []).slice(0, 30))}

Responde ÚNICAMENTE con un JSON con este schema: ${SCHEMAS[action]}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Límite de uso. Intenta más tarde." }, 429);
      if (aiResp.status === 402) return json({ error: "Sin créditos de IA. Recarga en Settings → Workspace." }, 402);
      return json({ error: "AI error", detail: txt }, 500);
    }

    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return json({ action, result: parsed });
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
