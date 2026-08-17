// Bucle de tool-calling compartido por el coordinador y por cada especialista.

import { type AIProvider } from "../ai-provider.ts";
import { type AgentMessage, callAITools, type ToolDef } from "../ai-tools.ts";
import type { AgentContext, AgentTool } from "./types.ts";

export type ToolLoopInput = {
  provider: AIProvider;
  model: string;
  system: string;
  /** Turnos previos de usuario/asistente, ya recortados por quien llama. */
  history?: AgentMessage[];
  /** Mensaje que dispara esta ejecución. */
  message: string;
  tools: AgentTool[];
  ctx: AgentContext;
  /** Tope de rondas modelo -> herramientas -> modelo. */
  maxRounds?: number;
  maxTokens?: number;
};

export type ToolLoopOutput = {
  text: string;
  tokensIn: number;
  tokensOut: number;
  /** Cuántas herramientas se ejecutaron, para diagnóstico. */
  toolRuns: number;
};

function toToolDefs(tools: AgentTool[]): ToolDef[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

/**
 * Ejecuta el bucle hasta que el modelo responde sin pedir herramientas o se
 * agotan las rondas.
 *
 * Un error dentro de una herramienta no aborta la conversación: se devuelve al
 * modelo como resultado para que pueda corregir el rumbo o explicárselo al
 * usuario. Lo que sí aborta es un fallo del proveedor, que sube como excepción.
 */
export async function runToolLoop(input: ToolLoopInput): Promise<ToolLoopOutput> {
  const { provider, model, tools, ctx } = input;
  const maxRounds = input.maxRounds ?? 6;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const toolDefs = toToolDefs(tools);

  const messages: AgentMessage[] = [
    { role: "system", content: input.system },
    ...(input.history ?? []),
    { role: "user", content: input.message },
  ];

  let tokensIn = 0;
  let tokensOut = 0;
  let toolRuns = 0;
  let text = "";

  for (let round = 0; round < maxRounds; round++) {
    const res = await callAITools({
      provider,
      model,
      messages,
      tools: toolDefs,
      maxTokens: input.maxTokens,
    });
    tokensIn += res.tokens_in;
    tokensOut += res.tokens_out;

    if (res.toolCalls.length === 0) {
      text = res.content;
      break;
    }

    messages.push({
      role: "assistant",
      content: res.content,
      tool_calls: res.toolCalls,
      raw: res.raw,
    });

    for (const call of res.toolCalls) {
      let args: any = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        args = {};
      }

      let result: unknown;
      const tool = byName.get(call.name);
      if (!tool) {
        result = { error: `Herramienta desconocida: ${call.name}` };
      } else {
        toolRuns++;
        try {
          result = await tool.run(args, ctx);
        } catch (e: any) {
          result = { error: String(e?.message ?? e) };
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(result),
      });
    }

    // Última ronda consumida con herramientas pendientes: pedimos el cierre en
    // texto sin ofrecer más herramientas, para no cortar en seco.
    if (round === maxRounds - 1) {
      const closing = await callAITools({
        provider,
        model,
        messages,
        tools: [],
        maxTokens: input.maxTokens,
      });
      tokensIn += closing.tokens_in;
      tokensOut += closing.tokens_out;
      text = closing.content;
    }
  }

  return { text, tokensIn, tokensOut, toolRuns };
}
