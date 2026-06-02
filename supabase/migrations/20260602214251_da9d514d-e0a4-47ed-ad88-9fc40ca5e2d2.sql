
-- ============ ai_reco_settings (singleton) ============
CREATE TABLE IF NOT EXISTS public.ai_reco_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature NUMERIC NOT NULL DEFAULT 0.3,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.7,
  system_prompt TEXT NOT NULL DEFAULT 'Eres una IA de recomendaciones para el ecommerce Nutribatidos. Tu función es detectar la intención del cliente según búsquedas, clics, productos vistos, categorías visitadas, productos agregados al carrito e historial reciente. Solo puedes recomendar productos existentes del catálogo. No inventes productos, categorías ni promociones. No hagas diagnósticos médicos ni prometas curas. Devuelve siempre JSON con: intencion, confianza, productos_recomendados, categorias_recomendadas, packs_recomendados, mensaje_banner, cta.',
  base_url TEXT,
  api_key_secret_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_reco_settings_single_row CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reco_settings TO authenticated;
GRANT ALL ON public.ai_reco_settings TO service_role;

ALTER TABLE public.ai_reco_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_reco_settings"
  ON public.ai_reco_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER ai_reco_settings_set_updated_at
  BEFORE UPDATE ON public.ai_reco_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_reco_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ purchase_intents ============
CREATE TABLE IF NOT EXISTS public.purchase_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  product_ids UUID[] NOT NULL DEFAULT '{}',
  category_slugs TEXT[] NOT NULL DEFAULT '{}',
  pack_ids UUID[] NOT NULL DEFAULT '{}',
  banner_image TEXT,
  title TEXT,
  subtitle TEXT,
  cta_text TEXT,
  cta_url TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchase_intents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_intents TO authenticated;
GRANT ALL ON public.purchase_intents TO service_role;

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active intents"
  ON public.purchase_intents
  FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage intents"
  ON public.purchase_intents
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER purchase_intents_set_updated_at
  BEFORE UPDATE ON public.purchase_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_purchase_intents_active ON public.purchase_intents (is_active, priority);

-- Seed: intenciones iniciales sugeridas en el brief
INSERT INTO public.purchase_intents (name, slug, keywords, title, cta_text, priority)
VALUES
  ('Energía', 'energia', ARRAY['maca','energia','energía','cansancio','vitalidad','rendimiento','fuerza','agotamiento'], 'Recupera tu energía con nutrición natural', 'Ver productos para energía', 10),
  ('Digestión', 'digestion', ARRAY['digestion','digestión','estómago','fibra','intestino'], 'Cuida tu digestión de forma natural', 'Ver productos para digestión', 20),
  ('Control de peso', 'control-peso', ARRAY['bajar de peso','adelgazar','control de peso','quemar grasa','metabolismo'], 'Apoyo natural para tu control de peso', 'Ver productos para control de peso', 30),
  ('Articulaciones', 'articulaciones', ARRAY['articulaciones','rodilla','dolor articular','colageno','colágeno'], 'Cuida tus articulaciones', 'Ver productos para articulaciones', 40),
  ('Colágeno', 'colageno', ARRAY['colageno','colágeno','piel','cabello','uñas'], 'Colágeno para tu piel, cabello y uñas', 'Ver productos de colágeno', 50),
  ('Masa muscular', 'masa-muscular', ARRAY['proteina','proteína','masa muscular','musculo','músculo','fuerza'], 'Construye masa muscular', 'Ver productos para masa muscular', 60),
  ('Fitness', 'fitness', ARRAY['fitness','gimnasio','entrenamiento','workout','deporte'], 'Productos ideales para tu entrenamiento', 'Ver productos para entrenamiento', 70),
  ('Defensas', 'defensas', ARRAY['defensas','inmunidad','vitamina c','resfrio','resfrío'], 'Refuerza tus defensas', 'Ver productos para defensas', 80),
  ('Piel, cabello y uñas', 'belleza', ARRAY['piel','cabello','uñas','belleza','biotina'], 'Belleza natural desde adentro', 'Ver productos de belleza', 90),
  ('Bienestar general', 'bienestar', ARRAY['bienestar','salud','nutricion','nutrición'], 'Nutrición diaria para tu bienestar', 'Ver productos de bienestar', 100)
ON CONFLICT (slug) DO NOTHING;
