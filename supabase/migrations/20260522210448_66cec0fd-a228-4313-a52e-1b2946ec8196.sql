ALTER TABLE public.ai_product_settings
  ADD COLUMN IF NOT EXISTS image_provider text NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS image_api_key text,
  ADD COLUMN IF NOT EXISTS image_default_size text NOT NULL DEFAULT '1200x1200',
  ADD COLUMN IF NOT EXISTS image_default_format text NOT NULL DEFAULT 'webp',
  ADD COLUMN IF NOT EXISTS image_default_background text NOT NULL DEFAULT 'white_ecommerce',
  ADD COLUMN IF NOT EXISTS image_quality integer NOT NULL DEFAULT 85;