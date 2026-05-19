CREATE TABLE public.filter_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "group" TEXT NOT NULL CHECK ("group" IN ('type','goal','flavor','size')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("group", value)
);

ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled filter options"
ON public.filter_options FOR SELECT USING (is_enabled = true OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage filter options"
ON public.filter_options FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_filter_options_updated
BEFORE UPDATE ON public.filter_options
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.filter_options ("group", label, value, sort_order) VALUES
  ('type','Protein','Protein',10),
  ('type','Creatine','Creatine',20),
  ('type','Pre-Workout','Pre-Workout',30),
  ('type','Vitamins','Vitamins',40),
  ('type','Snacks','Snacks',50),
  ('type','Accessories','Accessories',60),
  ('type','Amino Acids','Amino Acids',70),
  ('flavor','Chocolate','Chocolate',10),
  ('flavor','Vanilla','Vanilla',20),
  ('flavor','Strawberry','Strawberry',30),
  ('flavor','Cookies & Cream','Cookies & Cream',40),
  ('flavor','Tropical Storm','Tropical Storm',50),
  ('flavor','Lemon Ice','Lemon Ice',60),
  ('flavor','Berry Blast','Berry Blast',70),
  ('size','300g','300g',10),
  ('size','500g','500g',20),
  ('size','750g','750g',30),
  ('size','900g','900g',40),
  ('size','1kg','1kg',50),
  ('size','2kg','2kg',60),
  ('size','4kg','4kg',70)
ON CONFLICT DO NOTHING;

-- Seed goal options from src/data/catalog.ts goals
INSERT INTO public.filter_options ("group", label, value, sort_order) VALUES
  ('goal','Ganar músculo','muscle-gain',10),
  ('goal','Quemar grasa','fat-burn',20),
  ('goal','Resistencia','endurance',30),
  ('goal','Recuperación','recovery',40),
  ('goal','Salud general','general-health',50),
  ('goal','Energía','energy',60)
ON CONFLICT DO NOTHING;
