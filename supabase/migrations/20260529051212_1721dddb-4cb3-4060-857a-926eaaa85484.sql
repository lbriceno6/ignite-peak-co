
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.search_ai_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  api_key TEXT,
  prompt_template TEXT NOT NULL DEFAULT '',
  result_mode TEXT NOT NULL DEFAULT 'todos',
  min_confidence NUMERIC NOT NULL DEFAULT 0.4,
  temperature NUMERIC NOT NULL DEFAULT 0.4,
  max_tokens INTEGER NOT NULL DEFAULT 600,
  fallback_whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  helper_text TEXT NOT NULL DEFAULT 'Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT search_ai_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.search_ai_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_ai_settings TO authenticated;
GRANT ALL ON public.search_ai_settings TO service_role;

ALTER TABLE public.search_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_ai_settings public read" ON public.search_ai_settings FOR SELECT USING (true);
CREATE POLICY "search_ai_settings admin write" ON public.search_ai_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.search_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  intent TEXT,
  related_category TEXT,
  related_products UUID[] NOT NULL DEFAULT '{}',
  message TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_needs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_needs TO authenticated;
GRANT ALL ON public.search_needs TO service_role;

ALTER TABLE public.search_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_needs public read active" ON public.search_needs FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "search_needs admin write" ON public.search_needs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_search_ai_settings_updated BEFORE UPDATE ON public.search_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_search_needs_updated BEFORE UPDATE ON public.search_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.search_ai_settings (id, prompt_template) VALUES (
  1,
  'Eres el buscador inteligente de Nutribatidos. Interpreta la NECESIDAD del cliente. No prometas curación. Usa frases como "puede ayudarte como complemento nutricional". Elige una necesidad de la lista entregada; si nada encaja, devuelve need vacío. Responde SIEMPRE en JSON válido con esta forma exacta: {"intent":"slug","need":"nombre","category":"slug-categoria","products":["nombre1"],"message":"texto humano corto"} Sin texto fuera del JSON.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.search_needs (slug, name, keywords, intent, related_category, message, priority) VALUES
  ('energia', 'Energía', ARRAY['cansancio','fatiga','sueño','rendimiento','vitalidad','fuerza','animo','energia','cansado','agotado'], 'energia', 'energia-y-rendimiento', 'Productos para ayudarte con energía y rendimiento.', 10),
  ('digestion', 'Digestión', ARRAY['inflamacion','gases','pesadez','estreñimiento','digestion','estomago','hinchazon','colon'], 'digestion', 'digestion-y-bienestar', 'Productos para apoyar tu bienestar digestivo.', 20),
  ('colageno', 'Colágeno', ARRAY['piel','articulaciones','huesos','elasticidad','recuperacion','colageno','arrugas','cabello'], 'colageno', 'colageno-y-belleza', 'Productos con colágeno y belleza.', 30),
  ('fitness', 'Fitness', ARRAY['gimnasio','masa muscular','entrenamiento','proteina','recuperacion','fuerza','musculo','gym'], 'fitness', 'fitness-y-deporte', 'Productos para acompañar tu entrenamiento.', 40),
  ('sin-azucar', 'Sin azúcar', ARRAY['diabetes','sin azucar','estevia','saludable','bajo en calorias','keto','azucar'], 'sin_azucar', 'sin-azucar', 'Productos sin azúcar añadida.', 50),
  ('nutricion-diaria', 'Nutrición diaria', ARRAY['desayuno','batido','vitaminas','minerales','alimentacion saludable','mañana','natural'], 'nutricion', 'nutricion-diaria', 'Opciones nutritivas para tu día a día.', 60),
  ('combos', 'Combos', ARRAY['pack','promocion','ahorro','mensual','tratamiento','rutina','combo','oferta'], 'combos', 'combos-y-packs', 'Combos y packs recomendados.', 70)
ON CONFLICT (slug) DO NOTHING;
