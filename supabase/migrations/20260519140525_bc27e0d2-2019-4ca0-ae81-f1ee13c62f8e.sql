-- 1. Add publish_mode to suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS publish_mode text NOT NULL DEFAULT 'direct';

-- 2. Add approval_status to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Backfill: existing supplier products stay approved (default already covers it).

-- 4. Trigger: if supplier is in 'review' mode, force pending on insert/update by non-admin
CREATE OR REPLACE FUNCTION public.enforce_product_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
BEGIN
  -- Admins can set any status
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.supplier_id IS NOT NULL THEN
    SELECT publish_mode INTO v_mode FROM public.suppliers WHERE id = NEW.supplier_id;
    IF v_mode = 'review' THEN
      NEW.approval_status := 'pending';
      NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_product_approval ON public.products;
CREATE TRIGGER trg_enforce_product_approval
  BEFORE INSERT OR UPDATE OF name, description, short_description, price, sale_price,
    main_image, gallery_images, ingredients, usage_instructions, category, stock
  ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_approval();

-- 5. Update public SELECT policy to require approval_status='approved'
DROP POLICY IF EXISTS "Public sees active products from approved suppliers" ON public.products;
CREATE POLICY "Public sees active approved products"
  ON public.products FOR SELECT
  TO public
  USING (
    (
      is_active = true
      AND approval_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = products.supplier_id AND s.status = 'approved')
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
  );
