
-- Extend search_ai_settings with live-search config
ALTER TABLE public.search_ai_settings
  ADD COLUMN IF NOT EXISTS live_suggestions_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_products integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS manual_suggestions text[] NOT NULL DEFAULT ARRAY[
    'omega 3','vitaminas','bienestar','omegas','colágeno','energía','digestión'
  ]::text[];

-- Keyword -> products mapping for the live search
CREATE TABLE IF NOT EXISTS public.search_keyword_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  category_slug text,
  need_slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS search_keyword_map_keyword_uk
  ON public.search_keyword_map (lower(keyword));

GRANT SELECT ON public.search_keyword_map TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_keyword_map TO authenticated;
GRANT ALL ON public.search_keyword_map TO service_role;

ALTER TABLE public.search_keyword_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_keyword_map public read"
  ON public.search_keyword_map FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "search_keyword_map admin write"
  ON public.search_keyword_map FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_search_keyword_map_updated
  BEFORE UPDATE ON public.search_keyword_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
