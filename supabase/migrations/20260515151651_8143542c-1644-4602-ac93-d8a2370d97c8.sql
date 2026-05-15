CREATE TYPE public.category_type AS ENUM ('product', 'blog');

CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type public.category_type NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update categories" ON public.categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.categories (name, slug, type, sort_order) VALUES
  ('Protein', 'protein', 'product', 1),
  ('Creatine', 'creatine', 'product', 2),
  ('Pre-Workout', 'pre-workout', 'product', 3),
  ('Vitamins', 'vitamins', 'product', 4),
  ('Snacks', 'snacks', 'product', 5),
  ('Amino Acids', 'amino-acids', 'product', 6),
  ('Accessories', 'accessories', 'product', 7),
  ('Nutrition', 'nutrition', 'blog', 1),
  ('Supplements', 'supplements', 'blog', 2),
  ('Performance', 'performance', 'blog', 3),
  ('Wellness', 'wellness', 'blog', 4);