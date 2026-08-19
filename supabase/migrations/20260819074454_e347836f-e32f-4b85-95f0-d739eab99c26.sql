ALTER TABLE public.seo_landing_pages
  ADD COLUMN IF NOT EXISTS hero_image_source text,
  ADD COLUMN IF NOT EXISTS hero_image_prompt text,
  ADD COLUMN IF NOT EXISTS hero_image_status text,
  ADD COLUMN IF NOT EXISTS hero_image_generated_at timestamptz;

UPDATE public.seo_landing_pages
SET hero_image_source = COALESCE(hero_image_source, 'manual'),
    hero_image_status = COALESCE(hero_image_status, 'generated')
WHERE hero_image IS NOT NULL AND trim(hero_image) <> '';