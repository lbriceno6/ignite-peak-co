
-- Mega menu builder tables
CREATE TABLE IF NOT EXISTS public.mega_menu_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_nav text NOT NULL DEFAULT 'products',
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  see_all_label text,
  see_all_href text,
  show_desktop boolean NOT NULL DEFAULT true,
  show_mobile boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mega_menu_columns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mega_menu_columns TO authenticated;
GRANT ALL ON public.mega_menu_columns TO service_role;

ALTER TABLE public.mega_menu_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active mega menu columns" ON public.mega_menu_columns
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert mega menu columns" ON public.mega_menu_columns
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update mega menu columns" ON public.mega_menu_columns
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete mega menu columns" ON public.mega_menu_columns
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mega_menu_columns_updated_at
  BEFORE UPDATE ON public.mega_menu_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mega_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.mega_menu_columns(id) ON DELETE CASCADE,
  display_label text NOT NULL,
  link_type text NOT NULL DEFAULT 'category',
  category_id uuid,
  goal_id uuid,
  url text,
  icon text,
  image_url text,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  show_desktop boolean NOT NULL DEFAULT true,
  show_mobile boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  seo_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mega_menu_items_column ON public.mega_menu_items(column_id);

GRANT SELECT ON public.mega_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mega_menu_items TO authenticated;
GRANT ALL ON public.mega_menu_items TO service_role;

ALTER TABLE public.mega_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active mega menu items" ON public.mega_menu_items
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert mega menu items" ON public.mega_menu_items
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update mega menu items" ON public.mega_menu_items
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete mega menu items" ON public.mega_menu_items
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mega_menu_items_updated_at
  BEFORE UPDATE ON public.mega_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
