ALTER TABLE public.search_ai_settings
  DROP COLUMN IF EXISTS prompt_template,
  DROP COLUMN IF EXISTS min_confidence,
  DROP COLUMN IF EXISTS fallback_whatsapp_enabled,
  DROP COLUMN IF EXISTS max_products;

REVOKE ALL ON TABLE public.search_ai_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.search_ai_settings TO service_role;