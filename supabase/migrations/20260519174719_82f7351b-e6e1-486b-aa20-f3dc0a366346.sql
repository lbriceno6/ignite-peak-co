
CREATE OR REPLACE FUNCTION public.supplier_owns_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.supplier_id IS NOT NULL
      AND oi.supplier_id = public.current_supplier_id()
  )
$$;

DROP POLICY IF EXISTS "Suppliers view orders that contain their items" ON public.orders;
CREATE POLICY "Suppliers view orders that contain their items"
ON public.orders FOR SELECT
USING (public.supplier_owns_order(id));
