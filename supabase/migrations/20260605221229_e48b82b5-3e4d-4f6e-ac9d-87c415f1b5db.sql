
DROP POLICY IF EXISTS "Public reads approved active suppliers" ON public.suppliers;

DROP VIEW IF EXISTS public.suppliers_public;
CREATE VIEW public.suppliers_public
WITH (security_invoker = true) AS
SELECT id, slug, business_name, commercial_name, description, logo_url,
       website, city, country, status, is_active, created_at
FROM public.suppliers
WHERE status = 'approved' AND is_active = true;

GRANT SELECT ON public.suppliers_public TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.ai_promotion_log FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.supplier_status_history FROM anon, authenticated;
