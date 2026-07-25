
DROP VIEW IF EXISTS public.ai_block_toggles_public;
DROP VIEW IF EXISTS public.combo_config_public;

CREATE OR REPLACE FUNCTION public.get_ai_block_toggles_public()
RETURNS TABLE(block_key text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT block_key, enabled FROM public.ai_block_toggles;
$$;

REVOKE ALL ON FUNCTION public.get_ai_block_toggles_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_block_toggles_public() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_combo_config_public()
RETURNS TABLE(
  id uuid,
  ai_enabled boolean,
  max_recommendations integer,
  show_in_product boolean,
  show_in_cart boolean,
  show_in_checkout boolean,
  show_in_search boolean,
  show_in_home boolean,
  show_in_category boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, ai_enabled, max_recommendations,
         show_in_product, show_in_cart, show_in_checkout,
         show_in_search, show_in_home, show_in_category, updated_at
  FROM public.combo_config
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_combo_config_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_combo_config_public() TO anon, authenticated;
