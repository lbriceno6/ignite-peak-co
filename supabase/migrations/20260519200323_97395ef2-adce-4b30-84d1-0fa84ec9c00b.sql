ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view helpful votes" ON public.review_helpful_votes;
CREATE POLICY "Anyone can view helpful votes" ON public.review_helpful_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users add own helpful vote" ON public.review_helpful_votes;
CREATE POLICY "Users add own helpful vote" ON public.review_helpful_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users remove own helpful vote" ON public.review_helpful_votes;
CREATE POLICY "Users remove own helpful vote" ON public.review_helpful_votes FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recompute_review_helpful()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review uuid := COALESCE(NEW.review_id, OLD.review_id); v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.review_helpful_votes WHERE review_id = v_review;
  UPDATE public.reviews SET helpful_count = v_count WHERE id = v_review;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_helpful_ins ON public.review_helpful_votes;
CREATE TRIGGER trg_helpful_ins AFTER INSERT ON public.review_helpful_votes FOR EACH ROW EXECUTE FUNCTION public.recompute_review_helpful();
DROP TRIGGER IF EXISTS trg_helpful_del ON public.review_helpful_votes;
CREATE TRIGGER trg_helpful_del AFTER DELETE ON public.review_helpful_votes FOR EACH ROW EXECUTE FUNCTION public.recompute_review_helpful();

CREATE OR REPLACE FUNCTION public.user_has_confirmed_purchase(_user_id uuid, _product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.slug = oi.product_slug
    WHERE o.user_id = _user_id
      AND p.id = _product_id
      AND o.status IN ('confirmed'::order_status,'preparing'::order_status,'shipped'::order_status,'delivered'::order_status)
  )
$$;

CREATE OR REPLACE FUNCTION public.recompute_product_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_product uuid := COALESCE(NEW.product_id, OLD.product_id); v_avg numeric;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) INTO v_avg
    FROM public.reviews WHERE product_id = v_product AND is_published = true;
  UPDATE public.products SET rating = v_avg WHERE id = v_product;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_reviews_recompute_rating ON public.reviews;
CREATE TRIGGER trg_reviews_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_product_rating();

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
CREATE POLICY "Anyone can view published reviews" ON public.reviews
FOR SELECT USING (
  is_published = true
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Verified buyers or admins insert reviews" ON public.reviews;
CREATE POLICY "Verified buyers or admins insert reviews" ON public.reviews
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND public.user_has_confirmed_purchase(auth.uid(), product_id))
);

DROP POLICY IF EXISTS "Admins can update any review" ON public.reviews;
DROP POLICY IF EXISTS "Author or admin update review" ON public.reviews;
CREATE POLICY "Author or admin update review" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));