
CREATE TABLE public.products_carousel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  title text NOT NULL DEFAULT 'Productos destacados',
  subtitle text,
  source text NOT NULL DEFAULT 'recent',
  total_items integer NOT NULL DEFAULT 8,
  visible_desktop numeric NOT NULL DEFAULT 4,
  visible_tablet numeric NOT NULL DEFAULT 2,
  visible_mobile numeric NOT NULL DEFAULT 1.2,
  autoplay boolean NOT NULL DEFAULT false,
  autoplay_speed integer NOT NULL DEFAULT 5,
  show_arrows boolean NOT NULL DEFAULT true,
  show_dots boolean NOT NULL DEFAULT false,
  show_view_all boolean NOT NULL DEFAULT true,
  view_all_label text NOT NULL DEFAULT 'Ver todos los productos',
  view_all_href text NOT NULL DEFAULT '/productos',
  manual_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products_carousel_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products_carousel_config TO authenticated;
GRANT ALL ON public.products_carousel_config TO service_role;

ALTER TABLE public.products_carousel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view carousel config" ON public.products_carousel_config
  FOR SELECT USING (true);
CREATE POLICY "Admins manage carousel config" ON public.products_carousel_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER products_carousel_config_updated_at
  BEFORE UPDATE ON public.products_carousel_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.products_carousel_config;

INSERT INTO public.products_carousel_config DEFAULT VALUES;
