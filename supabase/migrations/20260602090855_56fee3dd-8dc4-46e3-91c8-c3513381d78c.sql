
-- 1) search_ai_settings: prevent public reading of api_key via column-level GRANT
REVOKE SELECT ON public.search_ai_settings FROM anon, authenticated;
GRANT SELECT
  (id, enabled, provider, model, prompt_template, result_mode, min_confidence,
   temperature, max_tokens, fallback_whatsapp_enabled, helper_text,
   created_at, updated_at, live_suggestions_enabled, max_products, manual_suggestions)
  ON public.search_ai_settings TO anon, authenticated;
GRANT ALL ON public.search_ai_settings TO service_role;

-- 2) chat_ai_sessions: keep public INSERT for session creation, but block anon writes to PII columns.
--    Anonymous visitors may insert sessions but cannot write customer_name/phone/email — those are
--    populated server-side (edge functions / admin) via service_role which bypasses these grants.
REVOKE INSERT ON public.chat_ai_sessions FROM anon, authenticated;
GRANT INSERT
  (id, session_id, user_id, source, first_page, last_page, current_product_id, status,
   created_at, updated_at, visitor_id, referrer, medium, campaign, device_type, browser,
   os, country, city, timezone, consent_snapshot, landing_page, first_product_viewed,
   last_product_viewed)
  ON public.chat_ai_sessions TO anon, authenticated;
GRANT ALL ON public.chat_ai_sessions TO service_role;

-- 3) notifications: add explicit INSERT policy. Inserts happen via SECURITY DEFINER functions
--    (notify_user / notify_admins) using service_role, but make admin client inserts explicit too.
CREATE POLICY "Admins insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) resellers: add explicit self-insert INSERT policy (matches activate_reseller intent)
CREATE POLICY "User inserts own reseller"
  ON public.resellers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
