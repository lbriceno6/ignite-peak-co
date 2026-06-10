
CREATE TABLE IF NOT EXISTS public.order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.shipping_providers(id) ON DELETE SET NULL,
  carrier_code text NOT NULL DEFAULT 'shalom',
  tracking_number text,
  tracking_code text,
  ose_id text,
  status_internal text NOT NULL DEFAULT 'sin_tracking',
  status_external text,
  origin_name text,
  destination_name text,
  registered_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  last_event_title text,
  last_event_description text,
  last_event_date text,
  last_event_time text,
  history_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_response jsonb,
  last_checked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_shipments_order_id_key ON public.order_shipments(order_id);
CREATE INDEX IF NOT EXISTS order_shipments_carrier_status_idx ON public.order_shipments(carrier_code, status_internal);
CREATE INDEX IF NOT EXISTS order_shipments_last_checked_idx ON public.order_shipments(last_checked_at);

GRANT SELECT ON public.order_shipments TO authenticated;
GRANT ALL ON public.order_shipments TO service_role;

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own shipments"
  ON public.order_shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_shipments.order_id
        AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins manage shipments"
  ON public.order_shipments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS update_order_shipments_updated_at ON public.order_shipments;
CREATE TRIGGER update_order_shipments_updated_at
  BEFORE UPDATE ON public.order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.shipping_providers (name, code, cost, estimated_days, is_active, sort_order, notes)
SELECT 'Shalom', 'shalom', 0, '3–7 días hábiles', true, COALESCE((SELECT MAX(sort_order) + 1 FROM public.shipping_providers), 0), 'Integración wrapper Shalom Pro'
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_providers WHERE code = 'shalom');
