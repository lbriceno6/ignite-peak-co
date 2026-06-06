
-- Estandarizar cta_href de goal_cards a /objetivo/{slug}
UPDATE public.goal_cards
SET cta_href = '/objetivo/' || slug
WHERE cta_href IS NULL
   OR cta_href = '/category/goal-' || slug
   OR cta_href = '';

-- Sembrar redirecciones 301 desde URLs antiguas hacia /objetivo/{slug}
INSERT INTO public.seo_redirects (from_path, to_path, status_code, active)
SELECT '/category/goal-' || slug, '/objetivo/' || slug, 301, true
FROM public.goal_cards
ON CONFLICT (from_path) DO UPDATE
SET to_path = EXCLUDED.to_path, active = true;

-- Sembrar también para entradas en `goals` por compatibilidad
INSERT INTO public.seo_redirects (from_path, to_path, status_code, active)
SELECT '/category/goal-' || slug, '/objetivo/' || slug, 301, true
FROM public.goals
ON CONFLICT (from_path) DO UPDATE
SET to_path = EXCLUDED.to_path, active = true;
