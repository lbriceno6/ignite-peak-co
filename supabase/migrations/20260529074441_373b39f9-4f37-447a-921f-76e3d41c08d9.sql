
-- 1) Extend categories with SEO/admin fields
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS show_in_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_sitemap boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS related_category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_goal_ids uuid[] NOT NULL DEFAULT '{}';

-- Enforce global slug uniqueness (URL plana)
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique ON public.categories (slug);

-- 2) Goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  title_seo text,
  meta_description text,
  image_url text,
  short_description text,
  long_description text,
  canonical_url text,
  is_active boolean NOT NULL DEFAULT true,
  show_in_home boolean NOT NULL DEFAULT false,
  show_in_menu boolean NOT NULL DEFAULT true,
  show_in_mega_menu boolean NOT NULL DEFAULT true,
  show_in_sitemap boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  related_category_ids uuid[] NOT NULL DEFAULT '{}',
  related_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.goals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active goals"
  ON public.goals FOR SELECT TO public
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert goals"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update goals"
  ON public.goals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete goals"
  ON public.goals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;

-- 4) Backfill 301 redirects for nested category routes (/categoria/{parent}/{child} -> /categoria/{child})
INSERT INTO public.seo_redirects (from_path, to_path, status_code, active)
SELECT '/categoria/' || p.slug || '/' || c.slug,
       '/categoria/' || c.slug,
       301, true
FROM public.categories c
JOIN public.categories p ON p.id = c.parent_id
ON CONFLICT (from_path) DO NOTHING;
