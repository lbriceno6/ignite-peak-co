// Tipos compartidos del agente de administración.
//
// Arquitectura en dos capas:
//   - Coordinador: expone una herramienta por dominio y decide a cuál delegar.
//   - Especialista: dentro de un dominio, ejecuta las herramientas concretas.
//
// El coordinador nunca ve las herramientas finas de todos los dominios a la
// vez. Con ~8 dominios su lista se mantiene corta, que es justo lo que evita
// que el modelo confunda herramientas parecidas cuando el catálogo crece.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/**
 * Nivel de riesgo de una herramienta.
 *
 *   read      - solo consulta.
 *   write     - escritura reversible (un texto, una etiqueta, un borrador).
 *   sensitive - escritura con consecuencia real: dinero, stock, envíos,
 *               comunicaciones salientes, borrados.
 *
 * En esta fase el nivel se registra en la auditoría pero no bloquea nada: el
 * comportamiento del catálogo queda idéntico al actual. La barrera de
 * aprobación se apoya sobre este campo cuando se sumen pedidos e inventario.
 */
export type ToolRisk = "read" | "write" | "sensitive";

/** Acción efectiva devuelta al cliente para mostrarla en el chat. */
export type AgentAction = Record<string, unknown> & { action: string };

/** Fila de `admin_agent_log`. */
export type AuditEntry = {
  role?: string;
  content?: string;
  tool_name?: string;
  tool_args?: unknown;
  tool_result?: unknown;
  action?: string;
  /** Tabla afectada. Se llena siempre que la herramienta toque una fila. */
  target_table?: string;
  /** Id de la fila afectada. */
  target_id?: string | null;
  /** Compatibilidad con el registro previo, que solo conocía productos. */
  product_id?: string | null;
  before_value?: unknown;
  after_value?: unknown;
  tokens_in?: number | null;
  tokens_out?: number | null;
  latency_ms?: number | null;
};

/** Todo lo que una herramienta necesita para trabajar. */
export type AgentContext = {
  /** Cliente con el token del admin: respeta RLS. */
  supabase: SupabaseClient;
  /** Cliente service-role, solo para subir archivos a Storage. */
  service: SupabaseClient;
  /** Cabecera Authorization original, para invocar otras edge functions. */
  authHeader: string;
  supabaseUrl: string;
  anonKey: string;
  /** Imagen adjuntada en el chat, si la hay. */
  attachedImageUrl: string | null;
  /** Acciones efectivas acumuladas durante la conversación. */
  actions: AgentAction[];
  audit: (entry: AuditEntry) => Promise<void>;
};

export type AgentTool = {
  name: string;
  description: string;
  risk: ToolRisk;
  /** JSON Schema del objeto de entrada. */
  parameters: Record<string, unknown>;
  run: (args: any, ctx: AgentContext) => Promise<unknown>;
};

export type AgentDomain = {
  /** Identificador estable; también es el nombre de la herramienta del coordinador. */
  key: string;
  /** Nombre legible, para mensajes al usuario. */
  title: string;
  /** Qué sabe hacer este dominio. Lo lee el coordinador para decidir a quién delegar. */
  description: string;
  /** System prompt del especialista. */
  system: string;
  tools: AgentTool[];
};
