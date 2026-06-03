
-- Fase 20: extend seo_landing_pages with AI fields + landing generation job log
ALTER TABLE public.seo_landing_pages
  ADD COLUMN IF NOT EXISTS keyword text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS hero_image text,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_jsonld jsonb,
  ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS search_volume integer,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS public.ai_seo_landing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  kind text NOT NULL,
  slug text,
  landing_id uuid REFERENCES public.seo_landing_pages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  model text,
  error text,
  payload jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seo_landing_jobs TO authenticated;
GRANT ALL ON public.ai_seo_landing_jobs TO service_role;
ALTER TABLE public.ai_seo_landing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo landing jobs" ON public.ai_seo_landing_jobs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_ai_seo_landing_jobs_updated_at BEFORE UPDATE ON public.ai_seo_landing_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Fase 21: product SEO optimization log
CREATE TABLE IF NOT EXISTS public.ai_product_seo_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field text NOT NULL, -- 'name' | 'short_description' | 'description' | 'alt_text' | 'meta_title' | 'meta_description' | 'schema'
  before_value text,
  after_value text,
  ai_reason text,
  ai_score numeric,
  ctr_before numeric,
  conv_before numeric,
  views_window integer,
  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_product_seo_log_product ON public.ai_product_seo_log(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_product_seo_log_applied ON public.ai_product_seo_log(applied);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_product_seo_log TO authenticated;
GRANT ALL ON public.ai_product_seo_log TO service_role;
ALTER TABLE public.ai_product_seo_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage product seo log" ON public.ai_product_seo_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Per-product SEO metrics snapshot (rolling)
CREATE TABLE IF NOT EXISTS public.product_seo_metrics (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  impressions integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  add_to_cart integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  window_days integer NOT NULL DEFAULT 30,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_seo_metrics TO authenticated;
GRANT ALL ON public.product_seo_metrics TO service_role;
ALTER TABLE public.product_seo_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read product seo metrics" ON public.product_seo_metrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write product seo metrics" ON public.product_seo_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
