
-- 1) Validate order_items pricing/commission on insert
CREATE OR REPLACE FUNCTION public.validate_order_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_catalog numeric;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN NEW.quantity := 1; END IF;
  IF NEW.quantity > 999 THEN NEW.quantity := 999; END IF;

  SELECT COALESCE(p.sale_price, p.price) INTO v_catalog
    FROM public.products p WHERE p.slug = NEW.product_slug LIMIT 1;

  IF v_catalog IS NOT NULL AND v_catalog > 0 THEN
    -- never above catalog price, never below a 70% max-discount floor
    NEW.unit_price := LEAST(COALESCE(NEW.unit_price, v_catalog), v_catalog);
    NEW.unit_price := GREATEST(NEW.unit_price, ROUND(v_catalog * 0.30, 2));
  END IF;
  IF NEW.unit_price IS NULL OR NEW.unit_price < 0 THEN NEW.unit_price := 0; END IF;

  -- commissions are always server-computed (set_order_item_commission handles supplier rows)
  NEW.commission_percent := 0;
  NEW.commission_amount := 0;
  NEW.supplier_payout := 0;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_order_item_pricing ON public.order_items;
CREATE TRIGGER trg_validate_order_item_pricing
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_pricing();

-- make sure commission trigger runs after validation
DROP TRIGGER IF EXISTS set_order_item_commission_trg ON public.order_items;
DROP TRIGGER IF EXISTS trg_set_order_item_commission ON public.order_items;
CREATE TRIGGER trg_zz_set_order_item_commission
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_order_item_commission();

-- 2) Suppliers may only change fulfillment fields
CREATE OR REPLACE FUNCTION public.protect_order_item_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.order_id := OLD.order_id;
  NEW.product_slug := OLD.product_slug;
  NEW.product_name := OLD.product_name;
  NEW.quantity := OLD.quantity;
  NEW.unit_price := OLD.unit_price;
  NEW.supplier_id := OLD.supplier_id;
  NEW.commission_percent := OLD.commission_percent;
  NEW.commission_amount := OLD.commission_amount;
  NEW.supplier_payout := OLD.supplier_payout;
  NEW.purchase_type := OLD.purchase_type;
  NEW.subscription_interval_days := OLD.subscription_interval_days;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_order_item_financials ON public.order_items;
CREATE TRIGGER trg_protect_order_item_financials
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.protect_order_item_financials();

-- 3) Orders: clamp credit/discount and recompute total
CREATE OR REPLACE FUNCTION public.validate_order_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credit numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.subtotal := GREATEST(COALESCE(NEW.subtotal, 0), 0);
  NEW.shipping := GREATEST(COALESCE(NEW.shipping, 0), 0);
  NEW.reseller_discount_applied := GREATEST(COALESCE(NEW.reseller_discount_applied, 0), 0);

  SELECT COALESCE(balance_credit, 0) INTO v_credit
    FROM public.resellers WHERE user_id = NEW.user_id;
  NEW.store_credit_used := LEAST(
    GREATEST(COALESCE(NEW.store_credit_used, 0), 0),
    COALESCE(v_credit, 0),
    NEW.subtotal + NEW.shipping
  );

  NEW.total := GREATEST(0, NEW.subtotal + NEW.shipping - NEW.store_credit_used);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_order_amounts ON public.orders;
CREATE TRIGGER trg_validate_order_amounts
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_amounts();

CREATE OR REPLACE FUNCTION public.recalc_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_items numeric := 0;
  v_floor numeric := 0;
  v_sub numeric;
  o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = v_order;
  IF o IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF o.status <> 'pending'::order_status THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_items
    FROM public.order_items WHERE order_id = v_order;

  -- allow at most 60% aggregated discount (promos, combos, referral) below line totals
  v_floor := ROUND(v_items * 0.40, 2);
  v_sub := LEAST(GREATEST(COALESCE(o.subtotal, 0), v_floor), v_items);

  UPDATE public.orders
     SET subtotal = v_sub,
         store_credit_used = LEAST(COALESCE(store_credit_used, 0), v_sub + COALESCE(shipping, 0)),
         total = GREATEST(0, v_sub + COALESCE(shipping, 0) - LEAST(COALESCE(store_credit_used, 0), v_sub + COALESCE(shipping, 0)))
   WHERE id = v_order;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_recalc_order_totals ON public.order_items;
CREATE TRIGGER trg_recalc_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_totals();

-- 4) Subscriptions pricing validation
CREATE OR REPLACE FUNCTION public.validate_subscription_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_catalog numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.discount_percent := LEAST(GREATEST(COALESCE(NEW.discount_percent, 0), 0), 30);
  NEW.interval_days := LEAST(GREATEST(COALESCE(NEW.interval_days, 30), 7), 180);
  NEW.quantity := LEAST(GREATEST(COALESCE(NEW.quantity, 1), 1), 999);

  SELECT COALESCE(p.sale_price, p.price) INTO v_catalog
    FROM public.products p WHERE p.slug = NEW.product_slug LIMIT 1;

  IF v_catalog IS NOT NULL AND v_catalog > 0 THEN
    NEW.unit_price := ROUND(v_catalog * (1 - NEW.discount_percent / 100.0), 2);
  ELSIF NEW.unit_price IS NULL OR NEW.unit_price < 0 THEN
    NEW.unit_price := 0;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_subscription_pricing ON public.subscriptions;
CREATE TRIGGER trg_validate_subscription_pricing
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_pricing();
