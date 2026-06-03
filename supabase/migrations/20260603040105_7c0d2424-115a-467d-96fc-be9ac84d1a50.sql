REVOKE ALL ON TABLE public.search_ai_settings FROM anon;
REVOKE ALL ON TABLE public.search_ai_settings FROM authenticated;
REVOKE ALL ON TABLE public.search_ai_settings FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.search_ai_settings TO service_role;

GRANT SELECT (id, enabled, provider, model, result_mode, confidence_threshold, temperature, max_tokens, search_prompt, helper_text, show_whatsapp_fallback, live_suggestions_enabled, visible_products_limit, manual_suggestions, created_at, updated_at)
ON TABLE public.search_ai_settings TO authenticated;