
CREATE TABLE public.ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_prompt_versions_fn ON public.ai_prompt_versions(function_name, is_active DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompt_versions TO authenticated;
GRANT ALL ON public.ai_prompt_versions TO service_role;

ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_prompt_versions"
ON public.ai_prompt_versions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger: when activating a version, deactivate other versions of the same function.
CREATE OR REPLACE FUNCTION public.ensure_single_active_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.ai_prompt_versions
       SET is_active = false
     WHERE function_name = NEW.function_name
       AND id <> NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ensure_single_active_prompt
AFTER INSERT OR UPDATE OF is_active ON public.ai_prompt_versions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_prompt();

-- Helper readable by edge functions via service_role.
CREATE OR REPLACE FUNCTION public.get_active_ai_prompt(_function_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT system_prompt FROM public.ai_prompt_versions
   WHERE function_name = _function_name AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1
$$;
