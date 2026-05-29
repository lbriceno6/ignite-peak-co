
CREATE TABLE public.mega_menu_nav_settings (
  parent_nav text PRIMARY KEY,
  label text NOT NULL,
  href text NOT NULL,
  position int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mega_menu_nav_settings TO anon, authenticated;
GRANT ALL ON public.mega_menu_nav_settings TO service_role, authenticated;

ALTER TABLE public.mega_menu_nav_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read mega menu nav settings"
  ON public.mega_menu_nav_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admins manage mega menu nav settings"
  ON public.mega_menu_nav_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.mega_menu_nav_settings (parent_nav, label, href, position) VALUES
  ('products', 'Productos', '/productos', 1),
  ('goals', 'Compra por objetivo', '/objetivos', 2)
ON CONFLICT (parent_nav) DO NOTHING;
