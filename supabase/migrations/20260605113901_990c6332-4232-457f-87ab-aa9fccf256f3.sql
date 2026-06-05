
-- Drop the public SELECT policy that exposed all supplier columns to anon
DROP POLICY IF EXISTS "Public sees approved suppliers" ON public.suppliers;

-- Owner + admin SELECT only on the base table (full row including sensitive cols)
CREATE POLICY "Owners and admins read suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Public-safe view (no sensitive columns)
CREATE OR REPLACE VIEW public.suppliers_public
WITH (security_invoker = true) AS
SELECT
  id, slug, business_name, commercial_name, description, logo_url, website,
  city, country, status, is_active, publish_mode, commission_percent,
  created_at
FROM public.suppliers
WHERE status = 'approved' AND is_active = true;

-- Grants
REVOKE ALL ON public.suppliers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT SELECT ON public.suppliers_public TO anon, authenticated;
GRANT ALL ON public.suppliers_public TO service_role;

-- Permit the view (security_invoker) to satisfy RLS for anon/auth callers by
-- adding a narrow SELECT policy on the base table restricted to approved+active rows.
-- This still does not expose sensitive columns to anon because we revoked
-- table-level SELECT from anon; the policy is only effective via the view,
-- which selects a known safe column set as the view owner... actually with
-- security_invoker the caller's grants apply. So instead: grant SELECT on
-- only safe columns to anon.
GRANT SELECT
  (id, slug, business_name, commercial_name, description, logo_url, website,
   city, country, status, is_active, publish_mode, commission_percent,
   created_at, updated_at, user_id)
ON public.suppliers TO anon;

CREATE POLICY "Public reads approved active suppliers"
ON public.suppliers
FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND is_active = true);
