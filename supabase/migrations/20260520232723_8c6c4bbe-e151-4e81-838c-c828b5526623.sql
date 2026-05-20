
CREATE TABLE IF NOT EXISTS public.seo_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_change_logs_entity_idx
  ON public.seo_change_logs (entity_type, entity_id, changed_at DESC);

ALTER TABLE public.seo_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view change logs"
  ON public.seo_change_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert change logs"
  ON public.seo_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Helper to insert a change row
CREATE OR REPLACE FUNCTION public.log_seo_change(
  _entity_type text, _entity_id text, _field text, _old text, _new text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _old IS DISTINCT FROM _new THEN
    INSERT INTO public.seo_change_logs (entity_type, entity_id, field_changed, old_value, new_value, changed_by)
    VALUES (_entity_type, _entity_id, _field, _old, _new, auth.uid());
  END IF;
END $$;

-- Trigger on seo_meta
CREATE OR REPLACE FUNCTION public.trg_seo_meta_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'seo_title', OLD.seo_title, NEW.seo_title);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'seo_description', OLD.seo_description, NEW.seo_description);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'slug', OLD.slug, NEW.slug);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'canonical', OLD.canonical, NEW.canonical);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'robots_directive', OLD.robots_directive, NEW.robots_directive);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'schema_jsonld', OLD.schema_jsonld::text, NEW.schema_jsonld::text);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'shopping_title', OLD.shopping_title, NEW.shopping_title);
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id, 'shopping_description', OLD.shopping_description, NEW.shopping_description);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS seo_meta_log_changes ON public.seo_meta;
CREATE TRIGGER seo_meta_log_changes
AFTER UPDATE ON public.seo_meta
FOR EACH ROW EXECUTE FUNCTION public.trg_seo_meta_log();

-- Trigger on seo_image_alts
CREATE OR REPLACE FUNCTION public.trg_seo_alt_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_seo_change(NEW.entity_type, NEW.entity_id,
      'alt_text:' || NEW.image_url, OLD.alt_text, NEW.alt_text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS seo_alt_log_changes ON public.seo_image_alts;
CREATE TRIGGER seo_alt_log_changes
AFTER UPDATE ON public.seo_image_alts
FOR EACH ROW EXECUTE FUNCTION public.trg_seo_alt_log();

-- Trigger on seo_redirects (table exists from earlier stages)
CREATE OR REPLACE FUNCTION public.trg_seo_redirect_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_seo_change('redirect', NEW.id::text, 'created', NULL, NEW.from_path || ' -> ' || NEW.to_path);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_seo_change('redirect', NEW.id::text, 'from_path', OLD.from_path, NEW.from_path);
    PERFORM public.log_seo_change('redirect', NEW.id::text, 'to_path', OLD.to_path, NEW.to_path);
    PERFORM public.log_seo_change('redirect', NEW.id::text, 'active', OLD.active::text, NEW.active::text);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_seo_change('redirect', OLD.id::text, 'deleted', OLD.from_path || ' -> ' || OLD.to_path, NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'seo_redirects') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS seo_redirect_log_changes ON public.seo_redirects';
    EXECUTE 'CREATE TRIGGER seo_redirect_log_changes
             AFTER INSERT OR UPDATE OR DELETE ON public.seo_redirects
             FOR EACH ROW EXECUTE FUNCTION public.trg_seo_redirect_log()';
  END IF;
END $$;
