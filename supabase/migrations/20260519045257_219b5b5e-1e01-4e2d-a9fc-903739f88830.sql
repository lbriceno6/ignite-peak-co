
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cities TEXT[] NOT NULL DEFAULT '{}',
  cost NUMERIC NOT NULL DEFAULT 0,
  estimated_days TEXT,
  free_threshold NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping zones"
ON public.shipping_zones FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert shipping zones"
ON public.shipping_zones FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update shipping zones"
ON public.shipping_zones FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete shipping zones"
ON public.shipping_zones FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shipping_zones_updated_at
BEFORE UPDATE ON public.shipping_zones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.shipping_zones (name, cities, cost, estimated_days, free_threshold, sort_order) VALUES
  ('Lima Metropolitana', ARRAY['lima','callao','miraflores','san isidro','surco','san borja','la molina','barranco','chorrillos','san miguel','jesus maria','magdalena','pueblo libre','los olivos','san juan de lurigancho','san martin de porres','ate','comas','independencia','villa el salvador','villa maria del triunfo','san juan de miraflores'], 8, '1–3 días hábiles', 50, 1),
  ('Provincias cercanas', ARRAY['ica','huacho','huaral','cañete','chincha','huanuco','huánuco','pisco','barranca'], 15, '2–5 días hábiles', 150, 2),
  ('Provincias lejanas', ARRAY['arequipa','cusco','trujillo','piura','chiclayo','tacna','puno','iquitos','tarapoto','cajamarca','huancayo','ayacucho','tumbes','chimbote','juliaca','pucallpa','moquegua'], 25, '4–7 días hábiles', 250, 3);
