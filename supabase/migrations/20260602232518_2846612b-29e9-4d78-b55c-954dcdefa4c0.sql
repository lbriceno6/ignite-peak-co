ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS idx_orders_visitor_id ON public.orders(visitor_id);
CREATE INDEX IF NOT EXISTS idx_lucia_events_visitor_type_created ON public.lucia_events(visitor_id, event_type, created_at DESC);