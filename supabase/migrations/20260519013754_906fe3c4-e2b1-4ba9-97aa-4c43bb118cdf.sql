
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
-- Initialize sort_order using current creation date order so the list keeps a stable starting order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS rn FROM public.products
)
UPDATE public.products p SET sort_order = numbered.rn FROM numbered WHERE numbered.id = p.id AND p.sort_order = 0;
