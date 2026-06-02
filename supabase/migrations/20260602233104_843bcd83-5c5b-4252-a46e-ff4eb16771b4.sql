ALTER TABLE public.ai_prompt_versions
  ADD COLUMN IF NOT EXISTS traffic_weight integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS variant_label text;

ALTER TABLE public.ai_prompt_versions
  DROP CONSTRAINT IF EXISTS ai_prompt_versions_traffic_weight_check;
ALTER TABLE public.ai_prompt_versions
  ADD CONSTRAINT ai_prompt_versions_traffic_weight_check
  CHECK (traffic_weight BETWEEN 0 AND 100);

CREATE OR REPLACE FUNCTION public.ensure_single_active_prompt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-deactivate other variants when this row is being promoted to full traffic (100%).
  IF NEW.is_active = true AND COALESCE(NEW.traffic_weight, 100) = 100 THEN
    UPDATE public.ai_prompt_versions
       SET is_active = false
     WHERE function_name = NEW.function_name
       AND id <> NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_active_ai_prompt_weighted(_function_name text)
RETURNS TABLE(prompt_id uuid, system_prompt text, variant_label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_pick int;
  v_cum int := 0;
  r record;
BEGIN
  SELECT COALESCE(SUM(v.traffic_weight), 0)
    INTO v_total
    FROM public.ai_prompt_versions v
   WHERE v.function_name = _function_name
     AND v.is_active = true
     AND v.traffic_weight > 0;

  IF v_total <= 0 THEN
    RETURN;
  END IF;

  v_pick := floor(random() * v_total)::int + 1;
  IF v_pick < 1 THEN v_pick := 1; END IF;

  FOR r IN
    SELECT v.id, v.system_prompt, v.variant_label, v.traffic_weight
      FROM public.ai_prompt_versions v
     WHERE v.function_name = _function_name
       AND v.is_active = true
       AND v.traffic_weight > 0
     ORDER BY v.created_at ASC
  LOOP
    v_cum := v_cum + r.traffic_weight;
    IF v_pick <= v_cum THEN
      prompt_id := r.id;
      system_prompt := r.system_prompt;
      variant_label := r.variant_label;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END $$;