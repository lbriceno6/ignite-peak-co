
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

-- Unique slug per (type, parent_id). NULL parent treated as distinct, so use coalesce expression.
DROP INDEX IF EXISTS categories_slug_unique;
DROP INDEX IF EXISTS categories_slug_per_parent_unique;
CREATE UNIQUE INDEX categories_slug_per_parent_unique
  ON public.categories(type, coalesce(parent_id::text, 'root'), slug);

-- Seed main product categories (idempotent on slug+parent)
INSERT INTO public.categories (name, slug, type, sort_order, is_active, description)
VALUES
  ('Productos', 'productos', 'product', 1, true, 'Nutribatidos, superfoods, proteínas, semillas y productos naturales.'),
  ('Para tu salud', 'para-tu-salud', 'product', 2, true, 'Productos orientados al bienestar y apoyo nutricional diario.'),
  ('Promociones', 'promociones', 'product', 3, true, 'Combos, ofertas y novedades.')
ON CONFLICT DO NOTHING;

-- Seed subcategories
WITH p AS (SELECT id FROM public.categories WHERE slug='productos' AND type='product' AND parent_id IS NULL LIMIT 1)
INSERT INTO public.categories (name, slug, type, sort_order, is_active, parent_id)
SELECT v.name, v.slug, 'product', v.ord, true, p.id FROM p, (VALUES
  ('Nutribatidos','nutribatidos',1),
  ('Superfoods Andinos','superfoods-andinos',2),
  ('Proteínas y Colágeno','proteinas-y-colageno',3),
  ('Semillas y Cereales','semillas-y-cereales',4),
  ('Plantas Naturales','plantas-naturales',5),
  ('Aceites Naturales','aceites-naturales',6)
) AS v(name,slug,ord)
ON CONFLICT DO NOTHING;

WITH p AS (SELECT id FROM public.categories WHERE slug='para-tu-salud' AND type='product' AND parent_id IS NULL LIMIT 1)
INSERT INTO public.categories (name, slug, type, sort_order, is_active, parent_id)
SELECT v.name, v.slug, 'product', v.ord, true, p.id FROM p, (VALUES
  ('Energía y Vitalidad','energia-y-vitalidad',1),
  ('Próstata y Salud Masculina','prostata-y-salud-masculina',2),
  ('Hígado y Limpieza Natural','higado-y-limpieza-natural',3),
  ('Digestión y Colon','digestion-y-colon',4),
  ('Articulaciones y Huesos','articulaciones-y-huesos',5),
  ('Control de Peso','control-de-peso',6),
  ('Defensas e Inmunidad','defensas-e-inmunidad',7),
  ('Corazón y Circulación','corazon-y-circulacion',8),
  ('Riñones y Vías Urinarias','rinones-y-vias-urinarias',9),
  ('Piel, Cabello y Uñas','piel-cabello-y-unas',10)
) AS v(name,slug,ord)
ON CONFLICT DO NOTHING;

WITH p AS (SELECT id FROM public.categories WHERE slug='promociones' AND type='product' AND parent_id IS NULL LIMIT 1)
INSERT INTO public.categories (name, slug, type, sort_order, is_active, parent_id)
SELECT v.name, v.slug, 'product', v.ord, true, p.id FROM p, (VALUES
  ('Combos','combos',1),
  ('Ofertas','ofertas',2),
  ('Más vendidos','mas-vendidos',3),
  ('Nuevos productos','nuevos-productos',4)
) AS v(name,slug,ord)
ON CONFLICT DO NOTHING;
