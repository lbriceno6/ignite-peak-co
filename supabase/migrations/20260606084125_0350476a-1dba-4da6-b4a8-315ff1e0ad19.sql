ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_domain text;
CREATE INDEX IF NOT EXISTS idx_products_source_url ON public.products (source_url) WHERE source_url IS NOT NULL;