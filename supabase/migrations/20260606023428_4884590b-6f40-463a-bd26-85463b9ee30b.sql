
-- Helper to safely check supplier approval status, bypassing suppliers RLS.
CREATE OR REPLACE FUNCTION public.is_supplier_approved(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _supplier_id IS NULL OR EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = _supplier_id AND s.status = 'approved'
  )
$$;

-- Replace the public read policy: brand/supplier presence must NEVER hide an
-- active, approved product. Supplier RLS no longer allows anon/auth reads,
-- so the previous EXISTS subquery dropped any product with a supplier_id.
DROP POLICY IF EXISTS "Public sees active approved products" ON public.products;

CREATE POLICY "Public sees active approved products"
ON public.products
FOR SELECT
USING (
  (is_active = true AND approval_status = 'approved')
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
);
