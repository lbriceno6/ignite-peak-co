
-- Allow admins to manage any review
DROP POLICY IF EXISTS "Admins can insert reviews" ON public.reviews;
CREATE POLICY "Admins can insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;

DROP POLICY IF EXISTS "Admins can update any review" ON public.reviews;
CREATE POLICY "Admins can update any review" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;

-- Recompute product rating average on review changes
CREATE OR REPLACE FUNCTION public.recompute_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product uuid := COALESCE(NEW.product_id, OLD.product_id);
  v_avg numeric;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) INTO v_avg
    FROM public.reviews WHERE product_id = v_product;
  UPDATE public.products SET rating = v_avg WHERE id = v_product;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_reviews_recompute_rating ON public.reviews;
CREATE TRIGGER trg_reviews_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_product_rating();
