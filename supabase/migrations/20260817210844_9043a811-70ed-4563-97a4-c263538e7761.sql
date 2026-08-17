
DROP POLICY IF EXISTS "Client inserts combo events (no order spoofing)" ON public.combo_events;
CREATE POLICY "Client inserts combo events (no order spoofing)"
ON public.combo_events FOR INSERT TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) OR (user_id = auth.uid()))
  AND event_type IN ('view','cart_add')
  AND order_id IS NULL
  AND (amount IS NULL OR (amount >= 0 AND amount <= 100000))
  AND (source_location IS NULL OR length(source_location) <= 64)
  AND EXISTS (SELECT 1 FROM public.combos c WHERE c.id = combo_id)
);

CREATE OR REPLACE FUNCTION public.track_combo_purchase(_combo_id uuid, _order_id uuid, _source_location text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT o.total INTO _amount
  FROM public.orders o
  WHERE o.id = _order_id AND o.user_id = _uid;

  IF _amount IS NULL THEN
    RAISE EXCEPTION 'order not found for user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.combos c WHERE c.id = _combo_id) THEN
    RAISE EXCEPTION 'combo not found';
  END IF;

  INSERT INTO public.combo_events (combo_id, event_type, order_id, user_id, source_location, amount)
  VALUES (_combo_id, 'purchase', _order_id, _uid, left(coalesce(_source_location, 'checkout'), 64), _amount);
END;
$$;

REVOKE ALL ON FUNCTION public.track_combo_purchase(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_combo_purchase(uuid, uuid, text) TO authenticated;
