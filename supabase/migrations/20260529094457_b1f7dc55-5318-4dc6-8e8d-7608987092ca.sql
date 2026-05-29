DROP POLICY IF EXISTS "Public sees active approved products" ON public.products;

CREATE POLICY "Public sees active approved products"
  ON public.products
  FOR SELECT
  TO public
  USING (
    (
      is_active = true
      AND approval_status = 'approved'
      AND (
        supplier_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.suppliers s
          WHERE s.id = products.supplier_id
            AND s.status = 'approved'
        )
      )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
  );