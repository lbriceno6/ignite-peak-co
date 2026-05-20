
CREATE OR REPLACE FUNCTION public.search_products(q text)
RETURNS TABLE (
  id uuid, slug text, name text, short_description text,
  price numeric, sale_price numeric, main_image text,
  category text, rating numeric, score real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
  )
  SELECT p.id, p.slug, p.name, p.short_description, p.price, p.sale_price,
         p.main_image, p.category, p.rating, m.score
  FROM matched m
  JOIN products p ON p.id = m.id
  WHERE m.score > 0.15
  ORDER BY m.score DESC
  LIMIT 60;
$$;
