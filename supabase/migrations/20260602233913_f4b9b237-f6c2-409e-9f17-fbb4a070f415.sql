
CREATE TABLE public.ai_promotion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  window_days INT NOT NULL,
  winner_prompt_id UUID,
  winner_label TEXT,
  winner_rpc NUMERIC,
  winner_clicks INT,
  winner_orders INT,
  considered JSONB,
  mode TEXT NOT NULL DEFAULT 'manual',
  applied BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_promotion_log TO authenticated;
GRANT ALL ON public.ai_promotion_log TO service_role;

ALTER TABLE public.ai_promotion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promotion log"
ON public.ai_promotion_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_promotion_log_fn_created ON public.ai_promotion_log (function_name, created_at DESC);
