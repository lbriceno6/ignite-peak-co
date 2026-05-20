
-- SEO meta storage (polymorphic)
CREATE TABLE public.seo_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('product','category','blog','page')),
  entity_id text NOT NULL,
  slug text,
  seo_title text,
  seo_description text,
  keywords text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  og_image text,
  canonical text,
  schema_jsonld jsonb,
  shopping_title text,
  shopping_description text,
  short_description text,
  long_description text,
  noindex boolean NOT NULL DEFAULT false,
  score integer,
  last_analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX seo_meta_lookup_idx ON public.seo_meta (entity_type, entity_id);

ALTER TABLE public.seo_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SEO meta"
  ON public.seo_meta FOR SELECT
  USING (true);

CREATE POLICY "Admins manage SEO meta"
  ON public.seo_meta FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER seo_meta_set_updated_at
  BEFORE UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-image alt text
CREATE TABLE public.seo_image_alts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('product','category','blog','page')),
  entity_id text NOT NULL,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, image_url)
);

CREATE INDEX seo_image_alts_lookup_idx ON public.seo_image_alts (entity_type, entity_id);

ALTER TABLE public.seo_image_alts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view image alts"
  ON public.seo_image_alts FOR SELECT
  USING (true);

CREATE POLICY "Admins manage image alts"
  ON public.seo_image_alts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER seo_image_alts_set_updated_at
  BEFORE UPDATE ON public.seo_image_alts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Singleton settings
CREATE TABLE public.seo_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'Nutribatidos',
  default_title_template text NOT NULL DEFAULT '{title} | Nutribatidos',
  default_description text DEFAULT '',
  default_og_image text,
  brand text DEFAULT 'Nutribatidos',
  google_product_category text,
  robots_extra text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.seo_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SEO settings"
  ON public.seo_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage SEO settings"
  ON public.seo_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER seo_settings_set_updated_at
  BEFORE UPDATE ON public.seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
