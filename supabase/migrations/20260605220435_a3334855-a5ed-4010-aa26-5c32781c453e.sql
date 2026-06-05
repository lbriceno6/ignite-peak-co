
CREATE POLICY "Public read imported-images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'imported-images');

CREATE POLICY "Admins write imported-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imported-images' AND public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins update imported-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'imported-images' AND public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins delete imported-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'imported-images' AND public.has_role(auth.uid(),'admin'::public.app_role));
