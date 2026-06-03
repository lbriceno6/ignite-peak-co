const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const secretForProvider = (provider: string) => {
  if (provider === "deepseek") return "DEEPSEEK_API_KEY";
  if (provider === "claude") return "CLAUDE_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const provider = String(body?.provider ?? "gemini");
    const model = String(body?.model ?? "google/gemini-2.5-flash");
    const secretName = secretForProvider(provider);

    if (provider === "off") return json({ success: true, status: 200 });
    if (!secretName && provider !== "custom") {
      return json({ success: false, error: "Proveedor no soportado para prueba segura." });
    }

    if (provider === "claude") {
      const key = Deno.env.get("CLAUDE_API_KEY");
      if (!key) return json({ success: false, error: "Falta configurar el Secret CLAUDE_API_KEY." });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-20241022",
          max_tokens: 16,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const error = r.ok ? null : await r.text();
      return json({ success: r.ok, status: r.status, error });
    }

    if (provider === "deepseek") {
      const key = Deno.env.get("DEEPSEEK_API_KEY");
      if (!key) return json({ success: false, error: "Falta configurar el Secret DEEPSEEK_API_KEY." });
      const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: model || "deepseek-chat", messages: [{ role: "user", content: "ping" }], max_tokens: 16 }),
      });
      const error = r.ok ? null : await r.text();
      return json({ success: r.ok, status: r.status, error });
    }

    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
    if (!gatewayKey) {
      const fallbackSecret = secretName ? ` También falta el Secret ${secretName}.` : "";
      return json({ success: false, error: `No hay credencial segura del servidor para este proveedor.${fallbackSecret}` });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewayKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 16 }),
    });

    const error = r.ok ? null : await r.text();
    return json({ success: r.ok, status: r.status, error });
  } catch (err) {
    return json({ success: false, error: String((err as Error).message ?? err) });
  }
});
