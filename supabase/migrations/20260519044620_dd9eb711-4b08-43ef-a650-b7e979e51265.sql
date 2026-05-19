
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.shipping_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  estimated_days TEXT,
  zones TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping providers"
ON public.shipping_providers FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert shipping providers"
ON public.shipping_providers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update shipping providers"
ON public.shipping_providers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete shipping providers"
ON public.shipping_providers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shipping_providers_updated_at
BEFORE UPDATE ON public.shipping_providers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_content (key, value) VALUES
  ('shipping_free_threshold', '50'),
  ('shipping_default_cost', '4.9'),
  ('shipping_policy_intro', 'Hacemos entregas en Lima y provincias, trabajando con transportistas de confianza para mantener tus suplementos frescos y protegidos.'),
  ('shipping_policy_times_title', 'Tiempos de entrega'),
  ('shipping_policy_times', E'Lima Metropolitana: 1–3 días hábiles.\nProvincias: 3–7 días hábiles según la ciudad.'),
  ('shipping_policy_responsibility_title', 'Responsabilidad del cliente'),
  ('shipping_policy_responsibility', 'El cliente debe ingresar información de envío precisa al pagar. Voltra no se responsabiliza por retrasos causados por direcciones incorrectas o datos de contacto inaccesibles.'),
  ('shipping_policy_confirmation_title', 'Confirmación'),
  ('shipping_policy_confirmation', 'La confirmación del pedido y las actualizaciones de seguimiento se envían por WhatsApp o correo.'),
  ('shipping_providers_title', 'Transportistas con los que trabajamos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.shipping_providers (name, code, cost, estimated_days, zones, sort_order) VALUES
  ('Olva Courier', 'olva', 12, '2–5 días hábiles', 'Lima y provincias', 1),
  ('Shalom', 'shalom', 15, '3–7 días hábiles', 'Provincias', 2),
  ('Motorizado Lima', 'moto-lima', 8, 'Mismo día', 'Lima Metropolitana', 3);
