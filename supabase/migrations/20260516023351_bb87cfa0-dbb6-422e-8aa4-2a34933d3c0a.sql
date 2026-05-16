
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subscription_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_discount_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS subscription_intervals integer[] NOT NULL DEFAULT ARRAY[30,60,90];

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS subscription_interval_days integer;
