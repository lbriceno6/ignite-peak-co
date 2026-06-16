ALTER TABLE public.admin_agent_log
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN action DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS tool_name text,
  ADD COLUMN IF NOT EXISTS tool_args jsonb,
  ADD COLUMN IF NOT EXISTS tool_result jsonb,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS before_value jsonb,
  ADD COLUMN IF NOT EXISTS after_value jsonb,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_in integer,
  ADD COLUMN IF NOT EXISTS tokens_out integer,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

CREATE INDEX IF NOT EXISTS idx_admin_agent_log_session ON public.admin_agent_log(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_log_product ON public.admin_agent_log(product_id);