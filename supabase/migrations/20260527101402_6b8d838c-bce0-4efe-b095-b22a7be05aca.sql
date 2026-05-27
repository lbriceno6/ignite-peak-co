
CREATE TYPE public.promotion_benefit_type AS ENUM ('second_discount', 'second_free');

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  benefit_type public.promotion_benefit_type NOT NULL DEFAULT 'second_discount',
  discount_percent numeric NOT NULL DEFAULT 50,
  start_date timestamptz,
  end_date timestamptz,
  usage_limit_per_order integer NOT NULL DEFAULT 1,
  show_on_home boolean NOT NULL DEFAULT true,
  show_on_product boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active promotions" ON public.promotions
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert promotions" ON public.promotions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update promotions" ON public.promotions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete promotions" ON public.promotions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.promotion_products (
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promotion_id, product_id)
);

CREATE INDEX idx_promotion_products_product ON public.promotion_products(product_id);

GRANT SELECT ON public.promotion_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_products TO authenticated;
GRANT ALL ON public.promotion_products TO service_role;

ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views promotion_products" ON public.promotion_products
  FOR SELECT USING (true);

CREATE POLICY "Admins manage promotion_products" ON public.promotion_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
