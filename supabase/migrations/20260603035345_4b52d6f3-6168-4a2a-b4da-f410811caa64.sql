CREATE TABLE IF NOT EXISTS public.search_ai_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'deepseek',
  model text NOT NULL DEFAULT 'deepseek-chat',
  result_mode text NOT NULL DEFAULT 'all',
  confidence_threshold numeric NOT NULL DEFAULT 0.4,
  temperature numeric NOT NULL DEFAULT 0.4,
  max_tokens integer NOT NULL DEFAULT 600,
  search_prompt text NOT NULL DEFAULT 'Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.',
  helper_text text NOT NULL DEFAULT 'Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía',
  show_whatsapp_fallback boolean NOT NULL DEFAULT true,
  live_suggestions_enabled boolean NOT NULL DEFAULT true,
  visible_products_limit integer NOT NULL DEFAULT 4,
  manual_suggestions text NOT NULL DEFAULT 'omega 3, vitaminas, bienestar, colágeno, energía',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT search_ai_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_ai_settings TO authenticated;
GRANT ALL ON public.search_ai_settings TO service_role;
REVOKE ALL ON public.search_ai_settings FROM anon;

ALTER TABLE public.search_ai_settings
  ADD COLUMN IF NOT EXISTS result_mode text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS confidence_threshold numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS search_prompt text NOT NULL DEFAULT 'Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.',
  ADD COLUMN IF NOT EXISTS show_whatsapp_fallback boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_products_limit integer NOT NULL DEFAULT 4;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_ai_settings'
      AND column_name = 'manual_suggestions'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE public.search_ai_settings ALTER COLUMN manual_suggestions DROP DEFAULT;
    ALTER TABLE public.search_ai_settings
      ALTER COLUMN manual_suggestions TYPE text USING array_to_string(manual_suggestions, ', ');
  END IF;
END $$;

ALTER TABLE public.search_ai_settings
  ALTER COLUMN enabled SET DEFAULT false,
  ALTER COLUMN provider SET DEFAULT 'deepseek',
  ALTER COLUMN model SET DEFAULT 'deepseek-chat',
  ALTER COLUMN result_mode SET DEFAULT 'all',
  ALTER COLUMN confidence_threshold SET DEFAULT 0.4,
  ALTER COLUMN temperature SET DEFAULT 0.4,
  ALTER COLUMN max_tokens SET DEFAULT 600,
  ALTER COLUMN search_prompt SET DEFAULT 'Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.',
  ALTER COLUMN helper_text SET DEFAULT 'Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía',
  ALTER COLUMN show_whatsapp_fallback SET DEFAULT true,
  ALTER COLUMN live_suggestions_enabled SET DEFAULT true,
  ALTER COLUMN visible_products_limit SET DEFAULT 4,
  ALTER COLUMN manual_suggestions SET DEFAULT 'omega 3, vitaminas, bienestar, colágeno, energía';

UPDATE public.search_ai_settings
SET
  enabled = COALESCE(enabled, false),
  provider = COALESCE(NULLIF(provider, ''), 'deepseek'),
  model = COALESCE(NULLIF(model, ''), 'deepseek-chat'),
  result_mode = CASE WHEN result_mode IN ('todos', 'all') THEN 'all' ELSE COALESCE(NULLIF(result_mode, ''), 'all') END,
  confidence_threshold = COALESCE(confidence_threshold, min_confidence, 0.4),
  temperature = COALESCE(temperature, 0.4),
  max_tokens = COALESCE(max_tokens, 600),
  search_prompt = COALESCE(NULLIF(search_prompt, ''), NULLIF(prompt_template, ''), 'Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.'),
  helper_text = COALESCE(NULLIF(helper_text, ''), 'Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía'),
  show_whatsapp_fallback = COALESCE(show_whatsapp_fallback, fallback_whatsapp_enabled, true),
  live_suggestions_enabled = COALESCE(live_suggestions_enabled, true),
  visible_products_limit = COALESCE(visible_products_limit, max_products, 4),
  manual_suggestions = COALESCE(NULLIF(manual_suggestions, ''), 'omega 3, vitaminas, bienestar, colágeno, energía'),
  updated_at = now()
WHERE id = 1;

INSERT INTO public.search_ai_settings (
  id,
  enabled,
  provider,
  model,
  result_mode,
  confidence_threshold,
  temperature,
  max_tokens,
  search_prompt,
  helper_text,
  show_whatsapp_fallback,
  live_suggestions_enabled,
  visible_products_limit,
  manual_suggestions
)
VALUES (
  1,
  false,
  'deepseek',
  'deepseek-chat',
  'all',
  0.4,
  0.4,
  600,
  'Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.',
  'Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía',
  true,
  true,
  4,
  'omega 3, vitaminas, bienestar, colágeno, energía'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.search_ai_settings DROP COLUMN IF EXISTS api_key;
ALTER TABLE public.search_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_ai_settings public read" ON public.search_ai_settings;
DROP POLICY IF EXISTS "search_ai_settings admin write" ON public.search_ai_settings;
DROP POLICY IF EXISTS "search_ai_settings admin select" ON public.search_ai_settings;
DROP POLICY IF EXISTS "search_ai_settings admin insert" ON public.search_ai_settings;
DROP POLICY IF EXISTS "search_ai_settings admin update" ON public.search_ai_settings;
DROP POLICY IF EXISTS "search_ai_settings admin delete" ON public.search_ai_settings;

CREATE POLICY "search_ai_settings admin select"
ON public.search_ai_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_ai_settings admin insert"
ON public.search_ai_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_ai_settings admin update"
ON public.search_ai_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_ai_settings admin delete"
ON public.search_ai_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_search_ai_settings_updated ON public.search_ai_settings;
CREATE TRIGGER trg_search_ai_settings_updated
BEFORE UPDATE ON public.search_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();