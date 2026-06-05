// Central AI provider helper used by edge functions to call chat-completion
// models without duplicating provider/header/error logic.
//
// Default provider: Lovable AI Gateway (OpenAI-compatible).
// Also supports: deepseek (DEEPSEEK_API_KEY), gemini (GEMINI_API_KEY), openai
// (OPENAI_API_KEY), anthropic (ANTHROPIC_API_KEY).
//
// Usage:
//   import { callAI, normalizeAIError } from "../_shared/ai-provider.ts";
//   const { content, tokens_in, tokens_out, latency_ms } = await callAI({
//     messages: [{ role: "user", content: "Hola" }],
//     model: "google/gemini-2.5-flash",
//     temperature: 0.4,
//     maxTokens: 512,
//   });

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AIProvider = "lovable" | "deepseek" | "openai" | "gemini" | "anthropic";

export type CallAIInput = {
  provider?: AIProvider;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export type CallAIOutput = {
  content: string;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number;
  provider: AIProvider;
  model: string;
};

export type ProviderConfig = {
  provider: AIProvider;
  envVar: string;
  hasKey: boolean;
  defaultModel: string;
};

export function getProviderConfig(provider: AIProvider = "lovable"): ProviderConfig {
  switch (provider) {
    case "deepseek":
      return {
        provider,
        envVar: "DEEPSEEK_API_KEY",
        hasKey: !!Deno.env.get("DEEPSEEK_API_KEY"),
        defaultModel: "deepseek-chat",
      };
    case "openai":
      return {
        provider,
        envVar: "OPENAI_API_KEY",
        hasKey: !!Deno.env.get("OPENAI_API_KEY"),
        defaultModel: "gpt-4o-mini",
      };
    case "gemini":
      return {
        provider,
        envVar: "GEMINI_API_KEY",
        hasKey: !!Deno.env.get("GEMINI_API_KEY"),
        defaultModel: "gemini-2.0-flash-exp",
      };
    case "anthropic":
      return {
        provider,
        envVar: "ANTHROPIC_API_KEY",
        hasKey: !!Deno.env.get("ANTHROPIC_API_KEY"),
        defaultModel: "claude-3-5-haiku-latest",
      };
    case "lovable":
    default:
      return {
        provider: "lovable",
        envVar: "LOVABLE_API_KEY",
        hasKey: !!Deno.env.get("LOVABLE_API_KEY"),
        defaultModel: "google/gemini-2.5-flash",
      };
  }
}

export function validateProviderSecret(provider: AIProvider = "lovable"): void {
  const cfg = getProviderConfig(provider);
  if (!cfg.hasKey) {
    throw new Error(`Missing secret ${cfg.envVar} for provider ${cfg.provider}`);
  }
}

/** Best-effort safe JSON parse — returns null on failure instead of throwing. */
export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract first {...} or [...] block
    const m = raw.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch {}
    }
    return null;
  }
}

/** Map provider HTTP errors to user-friendly messages. */
export function normalizeAIError(status: number, bodyText: string, provider: AIProvider): Error {
  if (status === 429) {
    return new Error(`Rate limit excedido (${provider}). Intenta en unos segundos.`);
  }
  if (status === 402) {
    return new Error(
      provider === "lovable"
        ? "Sin créditos de IA. Agrega créditos en Workspace > Usage."
        : `Sin créditos en el proveedor ${provider}.`,
    );
  }
  if (status === 401 || status === 403) {
    return new Error(`Credenciales inválidas para ${provider} (HTTP ${status}).`);
  }
  return new Error(`Proveedor ${provider} respondió ${status}: ${bodyText.slice(0, 240)}`);
}

export async function callAI(input: CallAIInput): Promise<CallAIOutput> {
  const provider: AIProvider = input.provider ?? "lovable";
  const cfg = getProviderConfig(provider);
  validateProviderSecret(provider);
  const model = input.model || cfg.defaultModel;
  const temperature = input.temperature ?? 0.4;
  const maxTokens = input.maxTokens ?? 1024;
  const start = Date.now();

  // --- Gemini direct API ---
  if (provider === "gemini") {
    const key = Deno.env.get("GEMINI_API_KEY")!;
    const contents = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const sys = input.messages.find((m) => m.role === "system")?.content;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(input.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!r.ok) throw normalizeAIError(r.status, await r.text(), provider);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return {
      content: text,
      tokens_in: j.usageMetadata?.promptTokenCount ?? null,
      tokens_out: j.usageMetadata?.candidatesTokenCount ?? null,
      latency_ms: Date.now() - start,
      provider,
      model,
    };
  }

  // --- Anthropic direct API ---
  if (provider === "anthropic") {
    const key = Deno.env.get("ANTHROPIC_API_KEY")!;
    const sys = input.messages.find((m) => m.role === "system")?.content;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: sys,
        messages: input.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!r.ok) throw normalizeAIError(r.status, await r.text(), provider);
    const j = await r.json();
    return {
      content: j.content?.[0]?.text ?? "",
      tokens_in: j.usage?.input_tokens ?? null,
      tokens_out: j.usage?.output_tokens ?? null,
      latency_ms: Date.now() - start,
      provider,
      model,
    };
  }

  // --- OpenAI-compatible (lovable, deepseek, openai) ---
  let url = "";
  let authHeader: Record<string, string> = {};
  if (provider === "lovable") {
    url = "https://ai.gateway.lovable.dev/v1/chat/completions";
    authHeader = { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! };
  } else if (provider === "deepseek") {
    url = "https://api.deepseek.com/v1/chat/completions";
    authHeader = { Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}` };
  } else {
    url = "https://api.openai.com/v1/chat/completions";
    authHeader = { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` };
  }

  const r = await fetch(url, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature,
      max_tokens: maxTokens,
      ...(input.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw normalizeAIError(r.status, await r.text(), provider);
  const j = await r.json();
  return {
    content: j.choices?.[0]?.message?.content ?? "",
    tokens_in: j.usage?.prompt_tokens ?? null,
    tokens_out: j.usage?.completion_tokens ?? null,
    latency_ms: Date.now() - start,
    provider,
    model,
  };
}

/** Lists which provider secrets are currently configured. */
export function listProviderStatus(): Array<ProviderConfig> {
  return (["lovable", "gemini", "openai", "deepseek", "anthropic"] as AIProvider[]).map(getProviderConfig);
}
