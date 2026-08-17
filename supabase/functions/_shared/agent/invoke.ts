// Llamada a otras edge functions con el token del administrador.
//
// El agente no reimplementa lo que ya existe: invoca las funciones del panel.
// Se reenvía la cabecera Authorization original, así que esas funciones siguen
// haciendo su propia comprobación de rol y respetando RLS igual que cuando las
// dispara un humano desde la pantalla.

import type { AgentContext } from "./types.ts";

export type InvokeResult = {
  ok: boolean;
  status: number;
  body: any;
};

export async function invokeFunction(
  ctx: AgentContext,
  name: string,
  payload: unknown,
): Promise<InvokeResult> {
  const r = await fetch(`${ctx.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: ctx.authHeader,
      apikey: ctx.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

/** Extrae un mensaje de error legible de la respuesta de una edge function. */
export function invokeError(name: string, res: InvokeResult): string {
  const detail = res.body?.error ?? res.body?.message;
  return detail
    ? `${name}: ${detail}`
    : `${name} respondió ${res.status} sin detalle.`;
}
