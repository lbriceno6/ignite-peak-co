
ALTER TABLE public.seo_meta
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_site_name text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image text,
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS llms_summary text;

-- Extend logging trigger to cover the new fields (recreate function)
CREATE OR REPLACE FUNCTION public.trg_seo_meta_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  fields text[] := ARRAY[
    'seo_title','seo_description','slug','canonical','robots_directive',
    'og_image','og_title','og_description','og_site_name',
    'twitter_title','twitter_description','twitter_image',
    'h1','intro_text','llms_summary','noindex'
  ];
  f text;
  old_v text;
  new_v text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f) INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.seo_change_logs(entity_type, entity_id, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.entity_type, NEW.entity_id, f, old_v, new_v, uid);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Seed a home row if missing
INSERT INTO public.seo_meta (entity_type, entity_id, slug, seo_title, seo_description, canonical, robots_directive, og_site_name)
VALUES ('page','home','/','Nutribatidos · Batidos y suplementos naturales','Productos alimenticios naturales que ayudan a complementar una rutina saludable y contribuyen al bienestar general.','/','index,follow','Nutribatidos')
ON CONFLICT (entity_type, entity_id) DO NOTHING;
