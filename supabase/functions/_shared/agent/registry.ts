// Registro de dominios y construcción del coordinador.
//
// Para sumar un dominio: crear su archivo en `domains/` exportando un
// `AgentDomain` y añadirlo a `DOMAINS`. El coordinador gana una herramienta y
// no hay que tocar nada más.

import { type AIProvider } from "../ai-provider.ts";
import { runToolLoop } from "./runner.ts";
import type { AgentContext, AgentDomain, AgentTool } from "./types.ts";
import { catalogDomain } from "./domains/catalog.ts";
import { seoDomain } from "./domains/seo.ts";

export const DOMAINS: AgentDomain[] = [
  catalogDomain,
  seoDomain,
];

export const SYSTEM_COORDINATOR = `Eres el agente de administración de Nutribatidos (tienda peruana de suplementos).
Conversas en español con el administrador y coordinas especialistas por dominio.

Cómo trabajas:
- Identifica de qué dominio trata la petición y delega en el especialista correspondiente con una instrucción completa y autónoma: el especialista no ve esta conversación, así que incluye todo lo que necesita saber.
- Si una petición abarca varios dominios, delega por partes y reúne los resultados.
- Puedes delegar varias veces si el especialista pide una aclaración que tú ya conoces.
- Nunca inventes datos, ids ni resultados: lo único que puedes afirmar es lo que devolvieron los especialistas.

Cómo respondes:
- Español claro y directo, sin jerga técnica. Moneda en Soles (S/).
- Empieza por el resultado: qué pasó o qué encontraste. El detalle va después.
- Sin afirmaciones médicas ni promesas de curación.
- Si algo falló, dilo con claridad y explica qué haría falta para resolverlo.`;

/**
 * Convierte cada dominio en una herramienta del coordinador.
 *
 * El especialista corre en su propio bucle, con su system prompt y solo sus
 * herramientas. Al coordinador le vuelve un resumen en texto, no el detalle de
 * cada llamada: eso es lo que mantiene su contexto acotado por muchos dominios
 * que haya.
 */
export function buildCoordinatorTools(opts: {
  provider: AIProvider;
  model: string;
  /** Modelo para los especialistas; por defecto el mismo del coordinador. */
  specialistModel?: string;
  maxRounds?: number;
  maxTokens?: number;
  /** Acumula el consumo de los especialistas para reportarlo al cliente. */
  usage: { tokensIn: number; tokensOut: number };
}): AgentTool[] {
  return DOMAINS.map((domain): AgentTool => ({
    name: domain.key,
    description: domain.description,
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "Instrucción completa y autónoma para el especialista. Incluye todo el contexto necesario: no ve la conversación con el usuario.",
        },
      },
      required: ["instruction"],
    },
    async run(args: { instruction?: string }, ctx: AgentContext) {
      const instruction = typeof args?.instruction === "string" ? args.instruction.trim() : "";
      if (!instruction) return { error: "Indica una instrucción para el especialista." };

      const message = ctx.attachedImageUrl
        ? `${instruction}\n\n[IMAGEN_ADJUNTA disponible: el usuario adjuntó una imagen. Para usarla, llama la herramienta correspondiente dejando image_url vacío.]`
        : instruction;

      const res = await runToolLoop({
        provider: opts.provider,
        model: opts.specialistModel ?? opts.model,
        system: domain.system,
        message,
        tools: domain.tools,
        ctx,
        maxRounds: opts.maxRounds,
        maxTokens: opts.maxTokens,
      });

      opts.usage.tokensIn += res.tokensIn;
      opts.usage.tokensOut += res.tokensOut;

      return {
        domain: domain.key,
        result: res.text || "El especialista no devolvió un resumen.",
        tools_used: res.toolRuns,
      };
    },
  }));
}
