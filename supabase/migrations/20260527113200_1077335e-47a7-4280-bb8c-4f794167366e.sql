
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS show_in_menu boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS menu_column integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS menu_group_title text,
  ADD COLUMN IF NOT EXISTS menu_badge text,
  ADD COLUMN IF NOT EXISTS menu_type text NOT NULL DEFAULT 'mega',
  ADD COLUMN IF NOT EXISTS featured_title text,
  ADD COLUMN IF NOT EXISTS featured_text text,
  ADD COLUMN IF NOT EXISTS featured_cta_label text,
  ADD COLUMN IF NOT EXISTS featured_cta_href text,
  ADD COLUMN IF NOT EXISTS featured_image_url text,
  ADD COLUMN IF NOT EXISTS featured_enabled boolean NOT NULL DEFAULT false;
