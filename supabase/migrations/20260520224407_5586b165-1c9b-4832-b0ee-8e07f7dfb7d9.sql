
-- 1. GSC settings (singleton row)
CREATE TABLE public.seo_gsc_settings (
  id integer PRIMARY KEY DEFAULT 1,
  site_property text,
  verification_token text,
  verification_method text DEFAULT 'META',
  verified_at timestamptz,
  last_synced_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_gsc_settings_singleton CHECK (id = 1)
);
ALTER TABLE public.seo_gsc_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gsc settings" ON public.seo_gsc_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view gsc settings" ON public.seo_gsc_settings FOR SELECT USING (true);

-- 2. GSC URLs cache
CREATE TABLE public.seo_gsc_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  coverage_state text,
  is_indexable boolean DEFAULT true,
  last_crawl_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  UNIQUE (url)
);
ALTER TABLE public.seo_gsc_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gsc urls" ON public.seo_gsc_urls
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Merchant feed logs
CREATE TABLE public.merchant_feed_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  total_products integer NOT NULL DEFAULT 0,
  valid_products integer NOT NULL DEFAULT 0,
  invalid_products integer NOT NULL DEFAULT 0,
  errors_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ok'
);
CREATE INDEX merchant_feed_logs_generated_idx ON public.merchant_feed_logs (generated_at DESC);
ALTER TABLE public.merchant_feed_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view merchant logs" ON public.merchant_feed_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
-- service role bypass via SUPABASE_SERVICE_ROLE_KEY (no policy needed)

-- 4. Search logs (internal site search analytics)
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  clicked_product_id uuid,
  clicked_product_slug text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_logs_query_idx ON public.search_logs (lower(query));
CREATE INDEX search_logs_created_idx ON public.search_logs (created_at DESC);
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log searches" ON public.search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view all searches" ON public.search_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- 5. Suggested synonyms (auto-populated from zero-result searches)
CREATE TABLE public.seo_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  suggested_target_kind text,     -- product | ingredient | benefit | goal
  suggested_target_id text,       -- product.id or filter value
  hits integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', -- pending | mapped | ignored
  resolved_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term)
);
ALTER TABLE public.seo_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage synonyms" ON public.seo_synonyms
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view synonyms" ON public.seo_synonyms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert synonyms" ON public.seo_synonyms FOR INSERT WITH CHECK (true);

-- 6. Sensitive medical claims rules
CREATE TABLE public.sensitive_claims_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  severity text NOT NULL DEFAULT 'high',  -- high | medium | low
  suggestion text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pattern)
);
ALTER TABLE public.sensitive_claims_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage claims rules" ON public.sensitive_claims_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active claim rules" ON public.sensitive_claims_rules
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Seed default sensitive claim rules
INSERT INTO public.sensitive_claims_rules (pattern, severity, suggestion) VALUES
  ('cura', 'high', 'ayuda a complementar'),
  ('curar', 'high', 'ayuda a complementar'),
  ('elimina enfermedades', 'high', 'contribuye al bienestar'),
  ('elimina la enfermedad', 'high', 'contribuye al bienestar'),
  ('trata diabetes', 'high', 'producto alimenticio natural'),
  ('trata el cáncer', 'high', 'producto alimenticio natural'),
  ('sana órganos', 'high', 'apoya una rutina saludable'),
  ('reemplaza medicamentos', 'high', 'no reemplaza tratamiento médico'),
  ('reemplaza el medicamento', 'high', 'no reemplaza tratamiento médico'),
  ('previene el cáncer', 'high', 'producto alimenticio natural'),
  ('cura el cáncer', 'high', 'producto alimenticio natural'),
  ('100% efectivo', 'medium', 'puede contribuir'),
  ('garantiza resultados', 'medium', 'puede ayudar a complementar')
ON CONFLICT (pattern) DO NOTHING;
