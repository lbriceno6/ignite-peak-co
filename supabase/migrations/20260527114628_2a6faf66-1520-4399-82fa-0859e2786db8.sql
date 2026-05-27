
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS menu_label text,
  ADD COLUMN IF NOT EXISTS menu_badge_bg text,
  ADD COLUMN IF NOT EXISTS menu_badge_color text,
  ADD COLUMN IF NOT EXISTS menu_show_desktop boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS menu_show_mobile boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.menu_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_category_id uuid NULL,
  field_type text NOT NULL DEFAULT 'link',
  title text NOT NULL DEFAULT '',
  subtitle text NULL,
  href text NULL,
  image_url text NULL,
  cta_label text NULL,
  column_index integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  show_desktop boolean NOT NULL DEFAULT true,
  show_mobile boolean NOT NULL DEFAULT true,
  badge_text text NULL,
  badge_bg text NULL,
  badge_color text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_custom_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_custom_fields TO authenticated;
GRANT ALL ON public.menu_custom_fields TO service_role;

ALTER TABLE public.menu_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active menu custom fields"
  ON public.menu_custom_fields FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert menu custom fields"
  ON public.menu_custom_fields FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update menu custom fields"
  ON public.menu_custom_fields FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete menu custom fields"
  ON public.menu_custom_fields FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_menu_custom_fields_parent ON public.menu_custom_fields(parent_category_id, sort_order);
