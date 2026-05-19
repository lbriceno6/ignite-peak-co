
-- =========================================================
-- 1) Ampliar tabla suppliers
-- =========================================================
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_account text;

DO $$ BEGIN
  ALTER TABLE public.suppliers
    ADD CONSTRAINT suppliers_status_check
    CHECK (status IN ('pending','approved','suspended','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: existing suppliers were "approved" before
UPDATE public.suppliers SET status = 'approved' WHERE status = 'pending' AND created_at < now() - interval '1 minute';

-- Seed house supplier
INSERT INTO public.suppliers (business_name, slug, status, commission_percent, is_active, description)
SELECT 'Nutribatidos', 'nutribatidos', 'approved', 0, true, 'Marca propia de la tienda'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE slug = 'nutribatidos');

-- Generate slug for legacy suppliers missing one
UPDATE public.suppliers
SET slug = lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Reassign legacy products
UPDATE public.products
SET supplier_id = (SELECT id FROM public.suppliers WHERE slug = 'nutribatidos' LIMIT 1)
WHERE supplier_id IS NULL;

-- =========================================================
-- 2) Helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_supplier_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.suppliers
   WHERE user_id = auth.uid() AND status = 'approved'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_supplier_status()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status FROM public.suppliers
   WHERE user_id = auth.uid()
   LIMIT 1
$$;

-- =========================================================
-- 3) Protect privileged columns on suppliers
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_supplier_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_percent := OLD.commission_percent;
  NEW.user_id := OLD.user_id;
  NEW.slug := OLD.slug;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS suppliers_protect_fields ON public.suppliers;
CREATE TRIGGER suppliers_protect_fields
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.protect_supplier_fields();

-- =========================================================
-- 4) Suppliers RLS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view active suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins update suppliers" ON public.suppliers;

CREATE POLICY "Public sees approved suppliers"
ON public.suppliers FOR SELECT
USING (
  status = 'approved'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR auth.uid() = user_id
);

CREATE POLICY "Users self-register as supplier"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND status = 'pending'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Suppliers update own profile"
ON public.suppliers FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins delete suppliers"
ON public.suppliers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- 5) Products RLS rewrite
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins insert products" ON public.products;
DROP POLICY IF EXISTS "Admins update products" ON public.products;
DROP POLICY IF EXISTS "Admins delete products" ON public.products;

CREATE POLICY "Public sees active products from approved suppliers"
ON public.products FOR SELECT
USING (
  (is_active = true AND EXISTS (
    SELECT 1 FROM public.suppliers s
     WHERE s.id = products.supplier_id AND s.status = 'approved'
  ))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
);

CREATE POLICY "Admins or supplier insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
);

CREATE POLICY "Admins or supplier update products"
ON public.products FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
);

CREATE POLICY "Admins or supplier delete products"
ON public.products FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
);

-- =========================================================
-- 6) Order items: commission + fulfillment columns
-- =========================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number text;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_fulfillment_status_check
    CHECK (fulfillment_status IN ('pending','shipped','delivered','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON public.order_items(supplier_id);

CREATE OR REPLACE FUNCTION public.set_order_item_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pct numeric;
  v_total numeric;
BEGIN
  IF NEW.supplier_id IS NULL THEN
    SELECT p.supplier_id INTO NEW.supplier_id
      FROM public.products p WHERE p.slug = NEW.product_slug LIMIT 1;
  END IF;
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT commission_percent INTO v_pct FROM public.suppliers WHERE id = NEW.supplier_id;
    NEW.commission_percent := COALESCE(v_pct, 0);
    v_total := NEW.unit_price * NEW.quantity;
    NEW.commission_amount := ROUND(v_total * NEW.commission_percent / 100.0, 2);
    NEW.supplier_payout := ROUND(v_total - NEW.commission_amount, 2);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS order_items_set_commission ON public.order_items;
CREATE TRIGGER order_items_set_commission
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_order_item_commission();

CREATE POLICY "Suppliers view own order items"
ON public.order_items FOR SELECT TO authenticated
USING (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id());

CREATE POLICY "Suppliers update own order item fulfillment"
ON public.order_items FOR UPDATE TO authenticated
USING (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id())
WITH CHECK (supplier_id IS NOT NULL AND supplier_id = public.current_supplier_id());

-- Suppliers also need to read the parent order to display shipping address
CREATE POLICY "Suppliers view orders that contain their items"
ON public.orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
     WHERE oi.order_id = orders.id
       AND oi.supplier_id IS NOT NULL
       AND oi.supplier_id = public.current_supplier_id()
  )
);

-- =========================================================
-- 7) Storage bucket for supplier logos
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Supplier logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-logos');

CREATE POLICY "Suppliers upload own logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-logos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_supplier_id()::text
  )
);

CREATE POLICY "Suppliers update own logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'supplier-logos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_supplier_id()::text
  )
);

CREATE POLICY "Suppliers delete own logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supplier-logos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = public.current_supplier_id()::text
  )
);
