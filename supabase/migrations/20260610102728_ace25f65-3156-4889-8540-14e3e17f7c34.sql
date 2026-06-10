
-- 1) Drop plaintext API key columns; use Edge Function secrets instead
ALTER TABLE public.ai_product_settings
  DROP COLUMN IF EXISTS gemini_api_key,
  DROP COLUMN IF EXISTS openai_api_key,
  DROP COLUMN IF EXISTS claude_api_key,
  DROP COLUMN IF EXISTS deepseek_api_key,
  DROP COLUMN IF EXISTS image_api_key;

-- 2) chat_ai_messages: only backend (service_role) may insert
DROP POLICY IF EXISTS "Anyone inserts messages" ON public.chat_ai_messages;

-- 3) chat_ai_sessions: only backend (service_role) may insert/update
DROP POLICY IF EXISTS "Anyone creates session" ON public.chat_ai_sessions;
DROP POLICY IF EXISTS "Anyone updates session" ON public.chat_ai_sessions;

-- 4) Storage: replace public SELECT on the private imported-images bucket with admin-only
DROP POLICY IF EXISTS "Public read imported-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin read imported-images" ON storage.objects;
CREATE POLICY "Admin read imported-images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'imported-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
