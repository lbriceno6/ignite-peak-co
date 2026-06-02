CREATE TABLE IF NOT EXISTS public.ai_block_toggles (
  block_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_block_toggles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_block_toggles TO authenticated;
GRANT ALL ON public.ai_block_toggles TO service_role;

ALTER TABLE public.ai_block_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_block_toggles_read_all"
  ON public.ai_block_toggles FOR SELECT
  USING (true);

CREATE POLICY "ai_block_toggles_admin_write"
  ON public.ai_block_toggles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER ai_block_toggles_updated_at
  BEFORE UPDATE ON public.ai_block_toggles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_block_toggles (block_key, label, description) VALUES
  ('home_dynamic_banner', 'Home · Banner dinámico IA', 'Banner del Home que cambia según la intención detectada del visitante.'),
  ('home_recommended', 'Home · Recomendados para ti', 'Carrusel personalizado del Home basado en historial e intención.'),
  ('home_recently_viewed', 'Home · Vistos recientemente', 'Productos vistos recientemente por el visitante.'),
  ('cart_recommendations', 'Carrito · Recomendaciones IA', 'Productos complementarios sugeridos por IA en carrito y drawer.'),
  ('checkout_recommendations', 'Checkout · Súmalo antes de pagar', 'Upsell IA mostrado durante el checkout.'),
  ('intelligent_search', 'Buscador inteligente IA', 'Buscador con comprensión semántica y sugerencias IA.')
ON CONFLICT (block_key) DO NOTHING;