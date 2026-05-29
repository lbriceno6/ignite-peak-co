
-- 1) chat_ai_sessions: restrict SELECT to admins only (PII protection)
DROP POLICY IF EXISTS "Admins view sessions" ON public.chat_ai_sessions;
CREATE POLICY "Admins view sessions"
  ON public.chat_ai_sessions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) orders: scope supplier policy to authenticated only
DROP POLICY IF EXISTS "Suppliers view orders that contain their items" ON public.orders;
CREATE POLICY "Suppliers view orders that contain their items"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (supplier_owns_order(id));

-- 3) seo_synonyms: remove public INSERT policy (admins-only remains)
DROP POLICY IF EXISTS "Anyone can insert synonyms" ON public.seo_synonyms;

-- 4) suppliers: revoke column-level SELECT on sensitive columns from anon & authenticated
REVOKE SELECT (tax_id, email, phone, address, contact_name, payout_account, notes, payment_terms)
  ON public.suppliers FROM anon, authenticated;
-- Ensure service_role retains full access (it already has ALL but be explicit)
GRANT SELECT ON public.suppliers TO service_role;
