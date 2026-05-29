
-- ============ COMBOS INTELIGENTES ============

-- combos
CREATE TABLE public.combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  price_normal numeric(10,2) NOT NULL DEFAULT 0,
  price_combo numeric(10,2) NOT NULL DEFAULT 0,
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('amount','percent')),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  need_tag text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  display_locations text[] NOT NULL DEFAULT ARRAY['product','cart']::text[],
  stat_views integer NOT NULL DEFAULT 0,
  stat_cart_adds integer NOT NULL DEFAULT 0,
  stat_purchases integer NOT NULL DEFAULT 0,
  stat_revenue numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combos TO authenticated;
GRANT ALL ON public.combos TO service_role;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combos public read active" ON public.combos FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "combos admin write" ON public.combos FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER combos_updated_at BEFORE UPDATE ON public.combos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- combo_products
CREATE TABLE public.combo_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (combo_id, product_id)
);
GRANT SELECT ON public.combo_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_products TO authenticated;
GRANT ALL ON public.combo_products TO service_role;
ALTER TABLE public.combo_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_products public read" ON public.combo_products FOR SELECT USING (true);
CREATE POLICY "combo_products admin write" ON public.combo_products FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- combo_rules
CREATE TABLE public.combo_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN (
    'view_product','cart_has_product','cart_min_total','free_shipping_gap',
    'need_search','cart_has_category'
  )),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  need_tag text,
  min_cart_total numeric(10,2),
  max_cart_total numeric(10,2),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combo_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_rules TO authenticated;
GRANT ALL ON public.combo_rules TO service_role;
ALTER TABLE public.combo_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_rules public read active" ON public.combo_rules FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "combo_rules admin write" ON public.combo_rules FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- combo_config (singleton)
CREATE TABLE public.combo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled boolean NOT NULL DEFAULT false,
  ai_provider text CHECK (ai_provider IN ('gemini','openai','deepseek','claude')),
  ai_prompt text NOT NULL DEFAULT 'Eres un motor de recomendación para Nutribatidos, ecommerce de productos naturales. Recomienda únicamente combos existentes en la base de datos provista. Analiza producto visto, carrito, necesidad detectada y monto total. Recomienda máximo 3 combos útiles. No prometas curar enfermedades. Usa lenguaje comercial, natural y breve. Responde en JSON con la forma {"recommendations":[{"combo_id":"<uuid>","reason":"...","message":"..."}]}.',
  max_recommendations integer NOT NULL DEFAULT 3,
  show_in_product boolean NOT NULL DEFAULT true,
  show_in_cart boolean NOT NULL DEFAULT true,
  show_in_checkout boolean NOT NULL DEFAULT true,
  show_in_search boolean NOT NULL DEFAULT true,
  show_in_home boolean NOT NULL DEFAULT false,
  show_in_category boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combo_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_config TO authenticated;
GRANT ALL ON public.combo_config TO service_role;
ALTER TABLE public.combo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_config public read" ON public.combo_config FOR SELECT USING (true);
CREATE POLICY "combo_config admin write" ON public.combo_config FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER combo_config_updated_at BEFORE UPDATE ON public.combo_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.combo_config (id) VALUES (gen_random_uuid());

-- combo_events
CREATE TABLE public.combo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','cart_add','purchase')),
  order_id uuid,
  user_id uuid,
  source_location text,
  amount numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.combo_events TO anon;
GRANT SELECT, INSERT ON public.combo_events TO authenticated;
GRANT ALL ON public.combo_events TO service_role;
ALTER TABLE public.combo_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_events anyone insert" ON public.combo_events FOR INSERT WITH CHECK (true);
CREATE POLICY "combo_events admin read" ON public.combo_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_combo_events_combo ON public.combo_events(combo_id);
CREATE INDEX idx_combo_events_type ON public.combo_events(event_type);
CREATE INDEX idx_combo_events_created ON public.combo_events(created_at DESC);
CREATE INDEX idx_combo_products_combo ON public.combo_products(combo_id);
CREATE INDEX idx_combo_rules_combo ON public.combo_rules(combo_id);

-- storage bucket for combo images
INSERT INTO storage.buckets (id, name, public) VALUES ('combo-images','combo-images', true)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "combo-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'combo-images');
CREATE POLICY "combo-images admin write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'combo-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "combo-images admin update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'combo-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "combo-images admin delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'combo-images' AND public.has_role(auth.uid(),'admin'));
