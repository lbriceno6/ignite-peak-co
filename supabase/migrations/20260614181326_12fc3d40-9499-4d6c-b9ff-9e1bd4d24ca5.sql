
-- Explicit deny INSERT/UPDATE on chat_ai_messages for client roles (service_role bypasses RLS)
CREATE POLICY "Deny client inserts on chat_ai_messages" ON public.chat_ai_messages
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on chat_ai_messages" ON public.chat_ai_messages
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- Explicit deny INSERT/UPDATE on chat_ai_sessions for client roles
CREATE POLICY "Deny client inserts on chat_ai_sessions" ON public.chat_ai_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on chat_ai_sessions" ON public.chat_ai_sessions
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- Tighten dynamic_pricing_logs INSERT: only backend (service_role) writes these.
DROP POLICY IF EXISTS "Insert dynamic pricing logs with own user_id" ON public.dynamic_pricing_logs;
