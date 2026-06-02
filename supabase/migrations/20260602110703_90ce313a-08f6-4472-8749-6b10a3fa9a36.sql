ALTER TABLE public.home_blocks
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS home_blocks_not_deleted_sort_idx
  ON public.home_blocks (sort_order)
  WHERE is_deleted = false;

DROP POLICY IF EXISTS "Anyone can view active home blocks" ON public.home_blocks;
CREATE POLICY "Anyone can view active home blocks"
  ON public.home_blocks
  FOR SELECT
  USING (
    ((is_active = true) AND (is_deleted = false))
    OR has_role(auth.uid(), 'admin'::app_role)
  );