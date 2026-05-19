
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0;

UPDATE public.products SET brand = 'VOLTRA' WHERE brand IS NULL OR brand = '';

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products (rating);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products (supplier_id);
