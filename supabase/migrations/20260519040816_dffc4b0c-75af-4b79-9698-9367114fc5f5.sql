
CREATE TABLE public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_handle text,
  media_type text not null default 'image' check (media_type in ('image','video')),
  media_url text not null,
  thumbnail_url text,
  caption text,
  instagram_url text,
  rating integer default 5 check (rating between 1 and 5),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active testimonials"
ON public.testimonials FOR SELECT TO public
USING (is_active = true OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins insert testimonials"
ON public.testimonials FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins update testimonials"
ON public.testimonials FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins delete testimonials"
ON public.testimonials FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials','testimonials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read testimonials media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'testimonials');

CREATE POLICY "Admins upload testimonials media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'testimonials' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins update testimonials media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'testimonials' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins delete testimonials media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'testimonials' AND has_role(auth.uid(),'admin'::app_role));
