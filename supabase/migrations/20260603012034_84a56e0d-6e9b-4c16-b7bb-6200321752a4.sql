-- Reset grants for search_ai_settings (previous attempts left it without any privileges)
GRANT SELECT (id, enabled, provider, model, prompt_template, result_mode, min_confidence, temperature, max_tokens, fallback_whatsapp_enabled, helper_text, live_suggestions_enabled, max_products, manual_suggestions, created_at, updated_at)
  ON public.search_ai_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.search_ai_settings TO authenticated;
GRANT ALL ON public.search_ai_settings TO service_role;