
-- 1. resellers: remove public SELECT exposing financial data (use resolve_referral RPC instead)
DROP POLICY IF EXISTS "Public read for referral lookup" ON public.resellers;

-- 2. seo_gsc_settings: remove public SELECT exposing verification token
DROP POLICY IF EXISTS "Anyone can view gsc settings" ON public.seo_gsc_settings;

-- 3. suppliers: restrict sensitive columns from anon via column-level grants
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, slug, business_name, commercial_name, description, logo_url, website, city, country, status, publish_mode, commission_percent, is_active) ON public.suppliers TO anon;
GRANT SELECT ON public.suppliers TO authenticated;

-- 4. chat_ai_prompts: remove public SELECT — edge function reads with service role
DROP POLICY IF EXISTS "Anyone reads active prompt" ON public.chat_ai_prompts;

-- 5. chat_ai_sessions: remove unrestricted public UPDATE
DROP POLICY IF EXISTS "Anyone updates own session" ON public.chat_ai_sessions;

-- 6. visitor_tracking: remove unrestricted public UPDATE (anon can still INSERT)
DROP POLICY IF EXISTS "Anyone can update own visitor record" ON public.visitor_tracking;
CREATE POLICY "Authenticated updates own visitor record"
ON public.visitor_tracking
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
