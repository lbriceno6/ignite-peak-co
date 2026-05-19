
-- ============== TABLES ==============

CREATE TABLE public.reseller_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_sales numeric NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  customer_discount_percent numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  link_slug text NOT NULL UNIQUE,
  tier_id uuid REFERENCES public.reseller_tiers(id) ON DELETE SET NULL,
  total_sales numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  balance_cash numeric NOT NULL DEFAULT 0,
  balance_credit numeric NOT NULL DEFAULT 0,
  payout_method text NOT NULL DEFAULT 'choose' CHECK (payout_method IN ('cash','credit','choose')),
  payout_account text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reseller_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('link','code')),
  subtotal numeric NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE TABLE public.reseller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash','credit')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','paid','rejected')),
  notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============== ORDERS additions ==============

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_source text CHECK (referral_source IN ('link','code')),
  ADD COLUMN IF NOT EXISTS reseller_discount_applied numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_credit_used numeric NOT NULL DEFAULT 0;

-- ============== RLS ==============

ALTER TABLE public.reseller_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;

-- tiers: lectura pública, admin escribe
CREATE POLICY "Anyone views active tiers" ON public.reseller_tiers
  FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage tiers" ON public.reseller_tiers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- resellers: dueño y admin
CREATE POLICY "Reseller views own" ON public.resellers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Reseller updates own" ON public.resellers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete resellers" ON public.resellers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
-- public can resolve link_slug/code for tracking (read-only)
CREATE POLICY "Public read for referral lookup" ON public.resellers
  FOR SELECT USING (is_active = true);

-- referrals: dueño ve los suyos, admin todo, sistema inserta vía trigger (security definer)
CREATE POLICY "Reseller views own referrals" ON public.reseller_referrals
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.resellers r WHERE r.id = reseller_referrals.reseller_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Admins update referrals" ON public.reseller_referrals
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- payouts: dueño crea/ve, admin gestiona
CREATE POLICY "Reseller views own payouts" ON public.reseller_payouts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.resellers r WHERE r.id = reseller_payouts.reseller_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Reseller requests payout" ON public.reseller_payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'requested'
    AND EXISTS (SELECT 1 FROM public.resellers r WHERE r.id = reseller_payouts.reseller_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Admins update payouts" ON public.reseller_payouts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============== TIMESTAMP TRIGGERS ==============

CREATE TRIGGER trg_reseller_tiers_updated BEFORE UPDATE ON public.reseller_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_resellers_updated BEFORE UPDATE ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reseller_referrals_updated BEFORE UPDATE ON public.reseller_referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reseller_payouts_updated BEFORE UPDATE ON public.reseller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== HELPER FUNCTIONS ==============

-- recalc tier based on total_sales
CREATE OR REPLACE FUNCTION public.recalc_reseller_tier(_reseller_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tier uuid; v_sales numeric;
BEGIN
  SELECT total_sales INTO v_sales FROM public.resellers WHERE id = _reseller_id;
  SELECT id INTO v_tier FROM public.reseller_tiers
    WHERE is_active = true AND min_sales <= COALESCE(v_sales,0)
    ORDER BY min_sales DESC LIMIT 1;
  UPDATE public.resellers SET tier_id = v_tier WHERE id = _reseller_id;
END $$;

-- self register reseller (called by client)
CREATE OR REPLACE FUNCTION public.activate_reseller()
RETURNS public.resellers LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.resellers; v_code text; v_link text; v_tries int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_row FROM public.resellers WHERE user_id = v_uid;
  IF FOUND THEN RETURN v_row; END IF;

  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.resellers WHERE code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN RAISE EXCEPTION 'could not generate code'; END IF;
  END LOOP;

  v_link := replace(gen_random_uuid()::text, '-', '');
  v_link := substring(v_link, 1, 10);

  INSERT INTO public.resellers (user_id, code, link_slug)
  VALUES (v_uid, v_code, v_link)
  RETURNING * INTO v_row;

  PERFORM public.recalc_reseller_tier(v_row.id);
  SELECT * INTO v_row FROM public.resellers WHERE id = v_row.id;
  RETURN v_row;
END $$;

-- resolve a referral identifier (code or link_slug) and return its info
CREATE OR REPLACE FUNCTION public.resolve_referral(_ref text)
RETURNS TABLE (
  reseller_id uuid,
  source text,
  customer_discount_percent numeric,
  code text,
  link_slug text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT r.id,
         CASE WHEN r.code = upper(_ref) THEN 'code' ELSE 'link' END AS source,
         COALESCE(t.customer_discount_percent, 0) AS customer_discount_percent,
         r.code,
         r.link_slug
  FROM public.resellers r
  LEFT JOIN public.reseller_tiers t ON t.id = r.tier_id
  WHERE r.is_active = true AND (r.code = upper(_ref) OR r.link_slug = _ref)
  LIMIT 1
$$;

-- trigger on orders: when status becomes confirmed/preparing/shipped/delivered, create referral
CREATE OR REPLACE FUNCTION public.on_order_status_for_reseller()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_pct numeric;
  v_subtotal numeric;
  v_commission numeric;
  v_method text;
  v_existing uuid;
  v_paid_states text[] := ARRAY['confirmed','preparing','shipped','delivered'];
BEGIN
  IF NEW.reseller_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status::text = ANY(v_paid_states)
     AND (TG_OP = 'INSERT' OR OLD.status::text <> ANY(v_paid_states)) THEN

    SELECT id INTO v_existing FROM public.reseller_referrals WHERE order_id = NEW.id;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(t.commission_percent, 0), r.payout_method
      INTO v_pct, v_method
      FROM public.resellers r
      LEFT JOIN public.reseller_tiers t ON t.id = r.tier_id
      WHERE r.id = NEW.reseller_id;

    v_subtotal := COALESCE(NEW.subtotal,0) - COALESCE(NEW.reseller_discount_applied,0);
    v_commission := ROUND(v_subtotal * COALESCE(v_pct,0) / 100.0, 2);

    INSERT INTO public.reseller_referrals (reseller_id, order_id, source, subtotal, commission_percent, commission_amount, status)
    VALUES (NEW.reseller_id, NEW.id, COALESCE(NEW.referral_source,'link'), v_subtotal, COALESCE(v_pct,0), v_commission, 'approved');

    UPDATE public.resellers
      SET total_sales = total_sales + v_subtotal,
          total_commission = total_commission + v_commission,
          balance_cash = balance_cash + CASE WHEN v_method = 'credit' THEN 0 ELSE v_commission END,
          balance_credit = balance_credit + CASE WHEN v_method = 'credit' THEN v_commission ELSE 0 END
      WHERE id = NEW.reseller_id;

    PERFORM public.recalc_reseller_tier(NEW.reseller_id);

    PERFORM public.notify_user(
      (SELECT user_id FROM public.resellers WHERE id = NEW.reseller_id),
      'reseller_commission',
      'Nueva comisión',
      'Ganaste ' || v_commission::text || ' por el pedido ' || NEW.order_code,
      '/reseller/sales'
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_order_reseller_commission
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_status_for_reseller();

-- trigger to deduct store credit when an order is created using it
CREATE OR REPLACE FUNCTION public.consume_store_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_res uuid;
BEGIN
  IF COALESCE(NEW.store_credit_used,0) <= 0 THEN RETURN NEW; END IF;
  SELECT id INTO v_res FROM public.resellers WHERE user_id = NEW.user_id;
  IF v_res IS NULL THEN RETURN NEW; END IF;
  UPDATE public.resellers
     SET balance_credit = GREATEST(0, balance_credit - NEW.store_credit_used)
   WHERE id = v_res;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_consume_store_credit
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.consume_store_credit();

-- trigger on payout approval/payment to update balances
CREATE OR REPLACE FUNCTION public.on_payout_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'paid' THEN
    IF NEW.method = 'cash' THEN
      UPDATE public.resellers SET balance_cash = GREATEST(0, balance_cash - NEW.amount) WHERE id = NEW.reseller_id;
    ELSIF NEW.method = 'credit' THEN
      -- moving from cash balance to credit balance
      UPDATE public.resellers
        SET balance_cash = GREATEST(0, balance_cash - NEW.amount),
            balance_credit = balance_credit + NEW.amount
        WHERE id = NEW.reseller_id;
    END IF;
    NEW.processed_at := now();
    NEW.processed_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_on_payout_change
  BEFORE UPDATE ON public.reseller_payouts
  FOR EACH ROW EXECUTE FUNCTION public.on_payout_change();

-- ============== SEED ==============

INSERT INTO public.reseller_tiers (name, min_sales, commission_percent, customer_discount_percent, sort_order) VALUES
  ('Bronce', 0,    5,  5,  1),
  ('Plata',  500,  8,  7,  2),
  ('Oro',    2000, 12, 10, 3);
