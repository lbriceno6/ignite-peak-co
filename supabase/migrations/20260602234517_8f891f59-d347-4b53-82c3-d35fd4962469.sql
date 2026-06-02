CREATE TABLE public.ai_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code text,
  recipient_email text NOT NULL,
  email_type text NOT NULL DEFAULT 'order_confirmation_ai',
  template_name text,
  ai_picks jsonb DEFAULT '[]'::jsonb,
  ai_thank_you text,
  ai_prompt_id uuid,
  ai_variant text,
  source text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_email_log_order ON public.ai_email_log(order_id);
CREATE INDEX idx_ai_email_log_created ON public.ai_email_log(created_at DESC);

GRANT SELECT ON public.ai_email_log TO authenticated;
GRANT ALL ON public.ai_email_log TO service_role;

ALTER TABLE public.ai_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai_email_log"
  ON public.ai_email_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role writes ai_email_log"
  ON public.ai_email_log FOR INSERT
  TO service_role
  WITH CHECK (true);