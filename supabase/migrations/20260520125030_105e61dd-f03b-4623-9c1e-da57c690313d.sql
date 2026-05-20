CREATE TABLE public.seo_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  model text,
  seo_title text,
  seo_description text,
  slug text,
  keywords text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  short_description text,
  long_description text,
  shopping_title text,
  shopping_description text,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_alts jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX idx_seo_sugg_entity ON public.seo_suggestions(entity_type, entity_id, status, created_at DESC);

ALTER TABLE public.seo_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SEO suggestions"
ON public.seo_suggestions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));