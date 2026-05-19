
-- Bucket público para fuentes personalizadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-fonts', 'brand-fonts', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública
CREATE POLICY "Brand fonts public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-fonts');

-- Solo admins suben
CREATE POLICY "Admins upload brand fonts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-fonts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Solo admins eliminan
CREATE POLICY "Admins delete brand fonts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brand-fonts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Solo admins actualizan
CREATE POLICY "Admins update brand fonts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-fonts' AND public.has_role(auth.uid(), 'admin'::public.app_role));
