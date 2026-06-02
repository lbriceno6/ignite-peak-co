
-- Extend promotions with new optional fields
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS variant text,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge_label text,
  ADD COLUMN IF NOT EXISTS benefit_message text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS sort_order_home integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_msg_applied text,
  ADD COLUMN IF NOT EXISTS cart_msg_progress text,
  ADD COLUMN IF NOT EXISTS show_in_carousel boolean NOT NULL DEFAULT true;

-- Restrict allowed variant values
ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_variant_check;
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_variant_check
  CHECK (variant IS NULL OR variant IN (
    'second_discount','second_free','two_for_one','percent_off',
    'fixed_off','quantity_discount','custom'
  ));

-- Backfill variant from existing benefit_type so old rows behave identically
UPDATE public.promotions
   SET variant = benefit_type::text
 WHERE variant IS NULL;

-- Seed the new home block (only if it doesn't already exist)
INSERT INTO public.home_blocks
  (block_key, block_type, sort_order, is_active, eyebrow, title, subtitle, cta_label, cta_href)
SELECT
  'promotions_carousel', 'promotions_carousel',
  COALESCE((SELECT MAX(sort_order) FROM public.home_blocks), 0) + 1,
  true,
  'Promociones especiales',
  'Ofertas recomendadas para usted',
  'Productos seleccionados con descuentos exclusivos por tiempo limitado.',
  'Ver todas las promociones',
  '/promociones'
WHERE NOT EXISTS (
  SELECT 1 FROM public.home_blocks WHERE block_key = 'promotions_carousel'
);
