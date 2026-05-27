
CREATE TABLE public.product_benefits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon text NOT NULL DEFAULT 'truck',
  title text NOT NULL,
  subtitle text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_benefits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_benefits TO authenticated;
GRANT ALL ON public.product_benefits TO service_role;

ALTER TABLE public.product_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active benefits"
ON public.product_benefits FOR SELECT
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert benefits"
ON public.product_benefits FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update benefits"
ON public.product_benefits FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete benefits"
ON public.product_benefits FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER product_benefits_set_updated_at
BEFORE UPDATE ON public.product_benefits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.product_benefits (icon, title, subtitle, sort_order) VALUES
  ('truck', 'Envío gratis sobre S/ 50.00', 'Entrega 1–3 días', 1),
  ('shield', 'Garantía de devolución', '30 días', 2),
  ('medal', 'Producto certificado', 'Probado en laboratorio · Certificado GMP', 3),
  ('whatsapp', 'Atención por WhatsApp', 'Te ayudamos antes de comprar', 4);
