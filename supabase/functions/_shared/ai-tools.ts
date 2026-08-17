// Capa de tool-calling multi-proveedor.
//
// `ai-provider.ts` resuelve credenciales y endpoints pero solo hace chat plano:
// devuelve texto y no admite `tools`. Este módulo añade tool-calling encima de
// esa misma configuración, sin duplicar la selección de proveedor.
//
// Proveedores con tool-calling:
//   - lovable / openai / deepseek  -> formato OpenAI chat-completions
//   - anthropic                    -> formato nativo Messages API
//   - gemini (directo)             -> NO soportado; usar el gateway de Lovable,
//                                     que expone los modelos Gemini en formato OpenAI.
//
// Uso:
//   import { callAITools, resolveAgentProvider } from "../_shared/ai-tools.ts";

import {
  type AIProvider,
  getProviderConfig,
  normalizeAIError,
} from "./ai-provider.ts";

/** Definición de herramienta en JSON Schema, agnóstica del proveedor. */
export type ToolDef = {
  name: string;
  description: string;
  /** JSON Schema del objeto de entrada. */
  parameters: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  name: string;
  /** Argumentos sin parsear, tal como los emitió el modelo. */
  arguments: string;
};

/**
 * Mensaje de conversación con herramientas.
 *
 * `raw` guarda la representación nativa del turno del asistente tal como la
 * devolvió el proveedor. Es obligatorio reenviarla intacta en Anthropic: los
 * bloques `thinking` viajan ahí y la API rechaza el turno si se alteran.
 */
export type AgentMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[]; raw?: unknown }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

export type CallAIToolsInput = {
  provider: AIProvider;
  model: string;
  messages: AgentMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  /** Ignorado en Anthropic: los modelos Claude actuales rechazan `temperature`. */
  temperature?: number;
};

export type CallAIToolsOutput = {
  content: string;
  toolCalls: ToolCall[];
  /** Turno del asistente en formato nativo, para reenviarlo sin pérdida. */
  raw: unknown;
  tokens_in: number;
  tokens_out: number;
};

/** Proveedores que admiten tool-calling en esta capa. */
const TOOL_CAPABLE: AIProvider[] = ["lovable", "openai", "deepseek", "anthropic"];

/**
 * Modelos por defecto para trabajo de agente. Se apartan a propósito de los
 * `defaultModel` de `ai-provider.ts`, pensados para tareas de un solo turno:
 * un coordinador que elige entre varios dominios necesita más capacidad.
 */
const AGENT_DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  lovable: "openai/gpt-4o-mini",
  anthropic: "claude-opus-5",
};

/**
 * Elige proveedor y modelo para el agente.
 *
 * Prioridad: lo pedido en la request -> variables de entorno AGENT_PROVIDER /
 * AGENT_MODEL -> orden por defecto. El orden preserva el comportamiento previo
 * de `admin-agent` (openai primero) para que migrar no cambie coste ni latencia
 * sin que nadie lo decida.
 */
export function resolveAgentProvider(
  requested?: string,
): { provider: AIProvider; model: string } | null {
  const envProvider = Deno.env.get("AGENT_PROVIDER");
  const envModel = Deno.env.get("AGENT_MODEL");

  const order: AIProvider[] = ["openai", "deepseek", "lovable", "anthropic"];
  const preferred = [requested, envProvider].filter(
    (p): p is AIProvider => !!p && TOOL_CAPABLE.includes(p as AIProvider),
  );
  const candidates = [...preferred, ...order];

  for (const p of candidates) {
    if (getProviderConfig(p).hasKey) {
      return { provider: p, model: envModel || AGENT_DEFAULT_MODELS[p] };
    }
  }
  return null;
}

/** Mensaje de error accionable cuando no hay ninguna clave configurada. */
export function missingProviderMessage(): string {
  const names = TOOL_CAPABLE.map((p) => getProviderConfig(p).envVar).join(", ");
  return `No hay clave de IA configurada. Agrega una de estas en los secretos de Supabase: ${names}.`;
}

// --------------------------------------------------------------------------
// Formato OpenAI (lovable, openai, deepseek)
// --------------------------------------------------------------------------

function toOpenAIMessages(messages: AgentMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
    }
    if (m.role === "assistant") {
      // Se reconstruye en vez de reenviar `raw`: la respuesta de estos
      // proveedores trae campos extra (refusal, reasoning_content) que no
      // aportan nada al reenviarse y que no todos aceptan de vuelta.
      return {
        role: "assistant",
        content: m.content,
        ...(m.tool_calls?.length
          ? {
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.arguments },
            })),
          }
          : {}),
      };
    }
    return { role: m.role, content: m.content };
  });
}

function openAIEndpoint(provider: AIProvider): { url: string; headers: Record<string, string> } {
  if (provider === "lovable") {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! },
    };
  }
  if (provider === "deepseek") {
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}` },
    };
  }
  return {
    url: "https://api.openai.com/v1/chat/completions",
    headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
  };
}

async function callOpenAICompatible(input: CallAIToolsInput): Promise<CallAIToolsOutput> {
  const { url, headers } = openAIEndpoint(input.provider);
  const r = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      messages: toOpenAIMessages(input.messages),
      // Sin herramientas se omiten también `tools` y `tool_choice`: mandar una
      // lista vacía junto a `tool_choice` es un 400 en varios proveedores.
      ...(input.tools.length
        ? {
          tools: input.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
          tool_choice: "auto",
        }
        : {}),
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 4096,
    }),
  });
  if (!r.ok) throw normalizeAIError(r.status, await r.text(), input.provider);

  const j = await r.json();
  const choice = j.choices?.[0]?.message ?? {};
  const toolCalls: ToolCall[] = (choice.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name ?? "",
    arguments: tc.function?.arguments ?? "{}",
  }));

  return {
    content: choice.content ?? "",
    toolCalls,
    raw: choice,
    tokens_in: j.usage?.prompt_tokens ?? 0,
    tokens_out: j.usage?.completion_tokens ?? 0,
  };
}

// --------------------------------------------------------------------------
// Formato Anthropic (Messages API)
// --------------------------------------------------------------------------

/**
 * Traduce al formato Anthropic. Dos diferencias que hay que respetar:
 *
 *  - Los resultados de herramienta van como bloques `tool_result` dentro de un
 *    mensaje `user`, y varios resultados seguidos deben agruparse en UN solo
 *    mensaje. Mandarlos por separado rompe el emparejamiento con el turno del
 *    asistente.
 *  - El turno del asistente se reenvía desde `raw` sin tocar: ahí viajan los
 *    bloques `thinking`, y la API rechaza el turno si se editan o se omiten.
 */
function toAnthropicMessages(messages: AgentMessage[]): { system?: string; messages: unknown[] } {
  const system = messages.find((m) => m.role === "system")?.content;
  const out: any[] = [];

  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      out.push({ role: "user", content: [{ type: "text", text: m.content }] });
      continue;
    }

    if (m.role === "assistant") {
      if (m.raw) {
        out.push({ role: "assistant", content: m.raw });
      } else {
        const blocks: any[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        for (const tc of m.tool_calls ?? []) {
          let parsed: unknown = {};
          try { parsed = JSON.parse(tc.arguments || "{}"); } catch { parsed = {}; }
          blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: parsed });
        }
        out.push({ role: "assistant", content: blocks });
      }
      continue;
    }

    // role === "tool": agrupar con el bloque de resultados anterior si lo hay.
    const block = { type: "tool_result", tool_use_id: m.tool_call_id, content: m.content };
    const last = out[out.length - 1];
    const lastIsToolResults = last?.role === "user" &&
      Array.isArray(last.content) &&
      last.content.every((b: any) => b?.type === "tool_result");

    if (lastIsToolResults) last.content.push(block);
    else out.push({ role: "user", content: [block] });
  }

  return { system, messages: out };
}

async function callAnthropic(input: CallAIToolsInput): Promise<CallAIToolsOutput> {
  const { system, messages } = toAnthropicMessages(input.messages);

  // Sin `temperature` a propósito: Claude Opus 5, Opus 4.8/4.7 y Fable 5 lo
  // rechazan con 400. La conducta se guía por el system prompt.
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens ?? 8192,
      ...(system ? { system } : {}),
      messages,
      ...(input.tools.length
        ? {
          tools: input.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
          })),
        }
        : {}),
    }),
  });
  if (!r.ok) throw normalizeAIError(r.status, await r.text(), "anthropic");

  const j = await r.json();
  const blocks: any[] = Array.isArray(j.content) ? j.content : [];

  const content = blocks
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  const toolCalls: ToolCall[] = blocks
    .filter((b) => b?.type === "tool_use")
    .map((b) => ({
      id: b.id,
      name: b.name,
      arguments: JSON.stringify(b.input ?? {}),
    }));

  return {
    content,
    toolCalls,
    raw: blocks,
    tokens_in: j.usage?.input_tokens ?? 0,
    tokens_out: j.usage?.output_tokens ?? 0,
  };
}

// --------------------------------------------------------------------------

/** Una ronda de conversación con herramientas contra el proveedor elegido. */
export function callAITools(input: CallAIToolsInput): Promise<CallAIToolsOutput> {
  if (input.provider === "anthropic") return callAnthropic(input);
  if (input.provider === "gemini") {
    return Promise.reject(
      new Error(
        "El proveedor gemini directo no admite tool-calling en esta capa. " +
          "Usa el gateway de Lovable (provider: lovable) con un modelo google/gemini-*.",
      ),
    );
  }
  return callOpenAICompatible(input);
}
