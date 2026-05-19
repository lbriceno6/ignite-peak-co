
-- Unique supplier per user (prevents parallel applications)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_user_id_unique'
  ) THEN
    -- Delete duplicates first if any (keep earliest)
    DELETE FROM public.suppliers s USING public.suppliers s2
      WHERE s.user_id = s2.user_id AND s.user_id IS NOT NULL AND s.ctid > s2.ctid;
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- History table
CREATE TABLE IF NOT EXISTS public.supplier_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_status_history_supplier
  ON public.supplier_status_history(supplier_id, created_at DESC);

ALTER TABLE public.supplier_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers view own history" ON public.supplier_status_history;
CREATE POLICY "Suppliers view own history"
  ON public.supplier_status_history FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_status_history.supplier_id AND s.user_id = auth.uid()
    )
  );

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_supplier_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.supplier_status_history (supplier_id, from_status, to_status, reason, changed_by)
    VALUES (NEW.id, NULL, NEW.status, 'Solicitud creada', auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.supplier_status_history (supplier_id, from_status, to_status, reason, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.rejection_reason, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_supplier_status ON public.suppliers;
CREATE TRIGGER trg_log_supplier_status
  AFTER INSERT OR UPDATE OF status ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.log_supplier_status_change();

-- Backfill: create initial history rows for existing suppliers that have no history
INSERT INTO public.supplier_status_history (supplier_id, from_status, to_status, reason, created_at)
SELECT s.id, NULL, s.status, 'Registro existente', s.created_at
FROM public.suppliers s
WHERE NOT EXISTS (SELECT 1 FROM public.supplier_status_history h WHERE h.supplier_id = s.id);
