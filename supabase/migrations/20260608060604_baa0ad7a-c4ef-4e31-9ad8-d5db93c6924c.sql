CREATE TABLE IF NOT EXISTS public.home_carousel_global (
  id text PRIMARY KEY DEFAULT 'default',
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  background jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_carousel_global TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_carousel_global TO authenticated;
GRANT ALL ON public.home_carousel_global TO service_role;

ALTER TABLE public.home_carousel_global ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read home carousel global config" ON public.home_carousel_global;
CREATE POLICY "Anyone can read home carousel global config"
ON public.home_carousel_global FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage home carousel global config" ON public.home_carousel_global;
CREATE POLICY "Admins manage home carousel global config"
ON public.home_carousel_global FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_home_carousel_global_updated ON public.home_carousel_global;
CREATE TRIGGER trg_home_carousel_global_updated
BEFORE UPDATE ON public.home_carousel_global
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.home_carousel_global (id, layout, background)
VALUES ('default', '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
