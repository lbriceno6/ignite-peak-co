
CREATE TABLE public.catalog_filter_settings (
  id integer PRIMARY KEY DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_filter_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.catalog_filter_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.catalog_filter_settings TO authenticated;
GRANT ALL ON public.catalog_filter_settings TO service_role;

ALTER TABLE public.catalog_filter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads catalog filter settings"
  ON public.catalog_filter_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins insert catalog filter settings"
  ON public.catalog_filter_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update catalog filter settings"
  ON public.catalog_filter_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.catalog_filter_settings (id, config) VALUES (
  1,
  '{
    "price":        {"enabled": true,  "order": 1},
    "category":     {"enabled": true,  "order": 2},
    "subcategory":  {"enabled": true,  "order": 3},
    "need":         {"enabled": true,  "order": 4},
    "presentation": {"enabled": true,  "order": 5},
    "flavor":       {"enabled": true,  "order": 6},
    "availability": {"enabled": true,  "order": 7},
    "size":         {"enabled": false, "order": 8},
    "brand":        {"enabled": false, "order": 9},
    "supplier":     {"enabled": false, "order": 10},
    "rating":       {"enabled": false, "order": 11}
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
