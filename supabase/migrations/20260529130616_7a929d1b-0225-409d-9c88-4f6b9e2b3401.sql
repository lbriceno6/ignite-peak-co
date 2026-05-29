-- Unified catalog filters system

CREATE TABLE IF NOT EXISTS public.catalog_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  filter_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  selection_type text NOT NULL DEFAULT 'multi',
  show_desktop boolean NOT NULL DEFAULT true,
  show_mobile boolean NOT NULL DEFAULT true,
  default_open boolean NOT NULL DEFAULT true,
  pages_visibility jsonb NOT NULL DEFAULT '["catalog","category","subcategory","brand","search","need","promotions","combos","featured","new","related"]'::jsonb,
  ui_widget text NOT NULL DEFAULT 'checkbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_filters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_filters TO authenticated;
GRANT ALL ON public.catalog_filters TO service_role;

ALTER TABLE public.catalog_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active catalog_filters"
  ON public.catalog_filters FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert catalog_filters"
  ON public.catalog_filters FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update catalog_filters"
  ON public.catalog_filters FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete catalog_filters"
  ON public.catalog_filters FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER catalog_filters_updated
  BEFORE UPDATE ON public.catalog_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.catalog_filter_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id uuid NOT NULL REFERENCES public.catalog_filters(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  value text,
  image_url text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filter_id, slug)
);

GRANT SELECT ON public.catalog_filter_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_filter_options TO authenticated;
GRANT ALL ON public.catalog_filter_options TO service_role;

ALTER TABLE public.catalog_filter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active catalog_filter_options"
  ON public.catalog_filter_options FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert catalog_filter_options"
  ON public.catalog_filter_options FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update catalog_filter_options"
  ON public.catalog_filter_options FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete catalog_filter_options"
  ON public.catalog_filter_options FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER catalog_filter_options_updated
  BEFORE UPDATE ON public.catalog_filter_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cfo_filter ON public.catalog_filter_options(filter_id);


CREATE TABLE IF NOT EXISTS public.product_filter_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  filter_id uuid NOT NULL REFERENCES public.catalog_filters(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.catalog_filter_options(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pfv_product_filter_option
  ON public.product_filter_values(product_id, filter_id, COALESCE(option_id::text, value));
CREATE INDEX IF NOT EXISTS idx_pfv_product ON public.product_filter_values(product_id);
CREATE INDEX IF NOT EXISTS idx_pfv_filter_option ON public.product_filter_values(filter_id, option_id);

GRANT SELECT ON public.product_filter_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_filter_values TO authenticated;
GRANT ALL ON public.product_filter_values TO service_role;

ALTER TABLE public.product_filter_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads product_filter_values"
  ON public.product_filter_values FOR SELECT USING (true);

CREATE POLICY "Admins write product_filter_values"
  ON public.product_filter_values FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Seed default filters
INSERT INTO public.catalog_filters (name, slug, filter_type, display_order, selection_type, ui_widget, pages_visibility)
VALUES
  ('Precio',        'precio',        'price',        1, 'single', 'range',
    '["catalog","category","subcategory","brand","search","need","promotions","combos","featured","new"]'::jsonb),
  ('Categoría',     'categoria',     'category',     2, 'multi',  'checkbox',
    '["catalog","brand","search","need","promotions","combos","featured","new"]'::jsonb),
  ('Marca',         'marca',         'brand',        3, 'multi',  'checkbox',
    '["catalog","category","subcategory","search","need","promotions","combos","featured","new"]'::jsonb),
  ('Necesidad',     'necesidad',     'need',         4, 'multi',  'checkbox',
    '["catalog","category","subcategory","brand","search","promotions","combos","featured","new"]'::jsonb),
  ('Ingredientes',  'ingredientes',  'ingredient',   5, 'multi',  'checkbox',
    '["catalog","category","subcategory","brand","search","need","promotions","combos"]'::jsonb),
  ('Beneficios',    'beneficios',    'benefit',      6, 'multi',  'checkbox',
    '["catalog","category","subcategory","brand","search","need","promotions","combos"]'::jsonb),
  ('Etiquetas',     'etiquetas',     'tag',          7, 'multi',  'checkbox',
    '["catalog","category","subcategory","brand","search","need","promotions","combos"]'::jsonb),
  ('Disponibilidad','disponibilidad','stock',        8, 'single', 'toggle',
    '["catalog","category","subcategory","brand","search","need","promotions","combos","featured","new"]'::jsonb),
  ('Promociones',   'promociones',   'promotion',    9, 'single', 'toggle',
    '["catalog","category","subcategory","brand","search","need","combos","featured","new"]'::jsonb),
  ('Valoración',    'valoracion',    'rating',      10, 'single', 'chips',
    '["catalog","category","subcategory","brand","search","need","promotions","combos","featured","new"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
