
-- Enum status
DO $$ BEGIN
  CREATE TYPE public.imported_product_status AS ENUM ('pending','reviewed','imported','discarded','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.web_import_job_status AS ENUM ('running','done','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.web_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_domain text,
  mode text NOT NULL DEFAULT 'auto',
  products_found int NOT NULL DEFAULT 0,
  products_imported int NOT NULL DEFAULT 0,
  status public.web_import_job_status NOT NULL DEFAULT 'running',
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_import_jobs TO authenticated;
GRANT ALL ON public.web_import_jobs TO service_role;
ALTER TABLE public.web_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage web_import_jobs" ON public.web_import_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_web_import_jobs_updated BEFORE UPDATE ON public.web_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.imported_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.web_import_jobs(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  source_domain text,
  original_title text,
  original_description text,
  original_price numeric,
  original_sale_price numeric,
  original_currency text,
  original_image_url text,
  original_gallery_urls jsonb DEFAULT '[]'::jsonb,
  detected_brand text,
  detected_category text,
  detected_stock text,
  imported_data jsonb DEFAULT '{}'::jsonb,
  ai_rewritten_title text,
  ai_rewritten_description text,
  ai_long_description text,
  ai_benefits jsonb DEFAULT '[]'::jsonb,
  ai_meta_title text,
  ai_meta_description text,
  ai_keywords jsonb DEFAULT '[]'::jsonb,
  ai_category_suggestion text,
  ai_intent_suggestion text,
  ai_ingredients jsonb DEFAULT '[]'::jsonb,
  stored_image_url text,
  status public.imported_product_status NOT NULL DEFAULT 'pending',
  created_product_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_products TO authenticated;
GRANT ALL ON public.imported_products TO service_role;
ALTER TABLE public.imported_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage imported_products" ON public.imported_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_imported_products_updated BEFORE UPDATE ON public.imported_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_imported_products_job ON public.imported_products(job_id);
CREATE INDEX IF NOT EXISTS idx_imported_products_status ON public.imported_products(status);
CREATE INDEX IF NOT EXISTS idx_web_import_jobs_created ON public.web_import_jobs(created_at DESC);
