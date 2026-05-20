
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- product_search_terms
CREATE TABLE IF NOT EXISTS public.product_search_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  term text NOT NULL,
  kind text NOT NULL DEFAULT 'keyword',
  weight numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, term, kind)
);

CREATE INDEX IF NOT EXISTS idx_pst_term_trgm ON public.product_search_terms USING gin (term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pst_product ON public.product_search_terms (product_id);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON public.products USING gin (description gin_trgm_ops);

ALTER TABLE public.product_search_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view search terms" ON public.product_search_terms
  FOR SELECT USING (true);
CREATE POLICY "Admins manage search terms" ON public.product_search_terms
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- seo_landing_pages
CREATE TABLE IF NOT EXISTS public.seo_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  intro text,
  long_description text,
  filter_field text,
  filter_value text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

ALTER TABLE public.seo_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published landing pages" ON public.seo_landing_pages
  FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage landing pages" ON public.seo_landing_pages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_seo_landing_pages_updated_at
  BEFORE UPDATE ON public.seo_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC search_products
CREATE OR REPLACE FUNCTION public.search_products(q text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  short_description text,
  price numeric,
  sale_price numeric,
  main_image text,
  category text,
  rating numeric,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH needle AS (SELECT lower(trim(q)) AS q),
  matched AS (
    SELECT p.id,
      GREATEST(
        similarity(lower(p.name), (SELECT q FROM needle)) * 2.0,
        similarity(lower(coalesce(p.description, '')), (SELECT q FROM needle)) * 0.6,
        COALESCE((
          SELECT MAX(similarity(lower(t.term), (SELECT q FROM needle)) * t.weight)
          FROM product_search_terms t WHERE t.product_id = p.id
        ), 0)
      )::real AS score
    FROM products p
    WHERE p.is_active = true AND p.approval_status = 'approved'
  )
  SELECT p.id, p.slug, p.name, p.short_description, p.price, p.sale_price,
         p.main_image, p.category, p.rating, m.score
  FROM matched m
  JOIN products p ON p.id = m.id
  WHERE m.score > 0.15
  ORDER BY m.score DESC
  LIMIT 60;
$$;
