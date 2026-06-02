// Test connection to AI provider (Lovable AI Gateway by default)
// Returns success/failure for the "Probar conexión" button in admin.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const provider: string = body?.provider ?? "gemini";
    const model: string = body?.model ?? "google/gemini-2.5-flash";
    const apiKey: string | undefined = body?.api_key || undefined;
    const baseUrl: string | undefined = body?.base_url || undefined;

    let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let headers: Record<string, string> = { "Content-Type": "application/json" };

    if (provider === "claude") {
      if (!apiKey) throw new Error("Claude requires API Key");
      endpoint = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      const r = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-20241022",
          max_tokens: 16,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const ok = r.ok;
      const txt = ok ? null : await r.text();
      return new Response(
        JSON.stringify({ success: ok, status: r.status, error: txt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (provider === "deepseek") {
      if (!apiKey) throw new Error("DeepSeek requires API Key");
      endpoint = "https://api.deepseek.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (provider === "custom") {
      if (!baseUrl) throw new Error("Custom provider requires base_url");
      endpoint = baseUrl.replace(/\/$/, "") + "/chat/completions";
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      // gemini / openai via Lovable AI Gateway
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY missing on server");
      headers["Authorization"] = `Bearer ${key}`;
    }

    const r = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 16,
      }),
    });

    const ok = r.ok;
    const txt = ok ? null : await r.text();
    return new Response(
      JSON.stringify({ success: ok, status: r.status, error: txt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String((err as Error).message ?? err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
