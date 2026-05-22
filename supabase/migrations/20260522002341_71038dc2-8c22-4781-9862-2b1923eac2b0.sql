
CREATE TABLE IF NOT EXISTS public.ai_product_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_provider TEXT NOT NULL DEFAULT 'gemini',
  default_level TEXT NOT NULL DEFAULT 'equilibrado',
  gemini_api_key TEXT,
  openai_api_key TEXT,
  claude_api_key TEXT,
  deepseek_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_product_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.ai_product_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai_product_settings"
ON public.ai_product_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert ai_product_settings"
ON public.ai_product_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update ai_product_settings"
ON public.ai_product_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_ai_product_settings_updated_at
BEFORE UPDATE ON public.ai_product_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_product_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
