
-- analytics_settings (singleton)
CREATE TABLE public.analytics_settings (
  id integer PRIMARY KEY DEFAULT 1,
  ga4_measurement_id text,
  gtm_container_id text,
  meta_pixel_id text,
  google_ads_conversion_id text,
  google_ads_conversion_label text,
  ga4_enabled boolean NOT NULL DEFAULT true,
  gtm_enabled boolean NOT NULL DEFAULT true,
  pixel_enabled boolean NOT NULL DEFAULT true,
  ads_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_settings_singleton CHECK (id = 1)
);
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read analytics settings" ON public.analytics_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage analytics settings" ON public.analytics_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.analytics_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- product_events
CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  product_id uuid,
  product_slug text,
  landing_slug text,
  user_id uuid,
  session_id text,
  value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_events_type_created ON public.product_events (event_type, created_at DESC);
CREATE INDEX idx_product_events_product ON public.product_events (product_id);
CREATE INDEX idx_product_events_landing ON public.product_events (landing_slug);
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log events" ON public.product_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view events" ON public.product_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- seo_content_plan
CREATE TABLE public.seo_content_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_keyword text,
  target_url text,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_content_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content plan" ON public.seo_content_plan FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_content_plan_updated BEFORE UPDATE ON public.seo_content_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seo_redirects
CREATE TABLE public.seo_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active redirects" ON public.seo_redirects FOR SELECT USING (active = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage redirects" ON public.seo_redirects FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- robots_directive on seo_meta
ALTER TABLE public.seo_meta ADD COLUMN IF NOT EXISTS robots_directive text DEFAULT 'index,follow';
