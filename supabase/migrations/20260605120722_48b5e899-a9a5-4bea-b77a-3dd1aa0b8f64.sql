CREATE TABLE public.search_synonyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL DEFAULT '{}'::text[],
  boost_product_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  related_intent_slug TEXT,
  related_category_slug TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_synonyms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.search_synonyms TO authenticated;
GRANT ALL ON public.search_synonyms TO service_role;

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_synonyms public read active"
  ON public.search_synonyms FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_synonyms admin insert"
  ON public.search_synonyms FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_synonyms admin update"
  ON public.search_synonyms FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "search_synonyms admin delete"
  ON public.search_synonyms FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX search_synonyms_term_idx ON public.search_synonyms (term);
CREATE INDEX search_synonyms_active_idx ON public.search_synonyms (is_active) WHERE is_active = true;

CREATE TRIGGER set_search_synonyms_updated_at
  BEFORE UPDATE ON public.search_synonyms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
