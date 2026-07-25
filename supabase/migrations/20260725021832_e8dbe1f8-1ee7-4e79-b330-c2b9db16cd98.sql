
-- 1) ai_block_toggles: restrict full-row read to admin; expose safe columns via public view
DROP POLICY IF EXISTS ai_block_toggles_read_all ON public.ai_block_toggles;

CREATE POLICY ai_block_toggles_admin_read
  ON public.ai_block_toggles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.ai_block_toggles_public
  WITH (security_invoker = false) AS
  SELECT block_key, enabled FROM public.ai_block_toggles;

GRANT SELECT ON public.ai_block_toggles_public TO anon, authenticated;

-- 2) combo_config: restrict full-row read to admin; expose display flags publicly via view
DROP POLICY IF EXISTS "combo_config public read" ON public.combo_config;

CREATE POLICY combo_config_admin_read
  ON public.combo_config FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.combo_config_public
  WITH (security_invoker = false) AS
  SELECT id, ai_enabled, max_recommendations,
         show_in_product, show_in_cart, show_in_checkout,
         show_in_search, show_in_home, show_in_category, updated_at
  FROM public.combo_config;

GRANT SELECT ON public.combo_config_public TO anon, authenticated;
