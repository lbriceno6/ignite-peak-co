-- Agente IA del catálogo (admin) — registro de auditoría.
-- Cada mensaje del chat y cada acción (lectura/creación/edición) que el agente
-- ejecuta sobre el catálogo se registra aquí para trazabilidad.

CREATE TABLE IF NOT EXISTS public.admin_agent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  role text NOT NULL,                 -- 'user' | 'assistant' | 'tool'
  content text,
  tool_name text,                     -- nombre de la herramienta invocada (si aplica)
  tool_args jsonb,                    -- argumentos con que se llamó la herramienta
  tool_result jsonb,                  -- resultado devuelto por la herramienta
  product_id uuid,                    -- producto afectado (si aplica)
  action text,                        -- 'search' | 'get' | 'update' | 'create' | 'set_active'
  before_value jsonb,                 -- estado del producto antes del cambio
  after_value jsonb,                  -- estado del producto después del cambio
  provider text,
  model text,
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_agent_log_session ON public.admin_agent_log(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_log_product ON public.admin_agent_log(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_log_created ON public.admin_agent_log(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_agent_log TO authenticated;
GRANT ALL ON public.admin_agent_log TO service_role;

ALTER TABLE public.admin_agent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin agent log" ON public.admin_agent_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
