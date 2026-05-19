
CREATE TABLE IF NOT EXISTS public.footer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_index integer NOT NULL DEFAULT 1,
  label text NOT NULL,
  href text NOT NULL DEFAULT '/',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active footer links"
  ON public.footer_links FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert footer links"
  ON public.footer_links FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update footer links"
  ON public.footer_links FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete footer links"
  ON public.footer_links FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER footer_links_set_updated_at BEFORE UPDATE ON public.footer_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed site_content defaults (only if missing)
INSERT INTO public.site_content (key, value) VALUES
  ('footer_description', 'Premium nutrition and supplements engineered to fuel your training, recovery and everyday wellness.'),
  ('footer_newsletter_title', 'Join the inner circle'),
  ('footer_newsletter_help', 'Get 10% off your first order. No spam.'),
  ('footer_col1_title', 'Shop'),
  ('footer_col2_title', 'Company'),
  ('footer_col3_title', 'Help'),
  ('footer_copyright', '© {year} Voltra Nutrition. All rights reserved.'),
  ('footer_social_instagram', ''),
  ('footer_social_youtube', ''),
  ('footer_social_facebook', ''),
  ('footer_social_whatsapp', ''),
  ('footer_social_email', ''),
  ('footer_payment_badges', 'VISA,MASTERCARD,AMEX,PAYPAL,APPLE PAY,G PAY')
ON CONFLICT (key) DO NOTHING;

-- Seed default footer links (only if table is empty)
INSERT INTO public.footer_links (column_index, label, href, sort_order)
SELECT * FROM (VALUES
  (1, 'Protein', '/category/protein', 0),
  (1, 'Creatine', '/category/creatine', 1),
  (1, 'Pre-Workout', '/category/pre-workout', 2),
  (1, 'Vitamins', '/category/vitamins', 3),
  (1, 'Healthy Snacks', '/category/snacks', 4),
  (1, 'Accessories', '/category/accessories', 5),
  (2, 'About us', '/about', 0),
  (2, 'Guides & blog', '/blog', 1),
  (2, 'Contact', '/contact', 2),
  (3, 'Shipping policy', '/shipping-policies', 0),
  (3, 'Returns policy', '/returns-policies', 1),
  (3, 'Terms & conditions', '/terms-and-conditions', 2),
  (3, 'Privacy policy', '/privacy', 3),
  (3, 'Contact', '/contact', 4)
) AS t(column_index, label, href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.footer_links);
