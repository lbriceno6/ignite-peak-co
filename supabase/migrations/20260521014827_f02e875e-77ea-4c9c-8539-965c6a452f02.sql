
-- visitor_tracking
CREATE TABLE public.visitor_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL UNIQUE,
  session_id text,
  user_id uuid,
  first_page text,
  current_page text,
  last_page text,
  referrer text,
  source text,
  medium text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  fbclid text,
  ttclid text,
  device_type text,
  browser text,
  os text,
  language text,
  country text,
  region text,
  city text,
  timezone text,
  consent_analytics boolean NOT NULL DEFAULT false,
  consent_marketing boolean NOT NULL DEFAULT false,
  consent_personalization boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_tracking_visitor ON public.visitor_tracking(visitor_id);
CREATE INDEX idx_visitor_tracking_session ON public.visitor_tracking(session_id);
CREATE INDEX idx_visitor_tracking_source ON public.visitor_tracking(source);
CREATE INDEX idx_visitor_tracking_country ON public.visitor_tracking(country);
CREATE INDEX idx_visitor_tracking_created ON public.visitor_tracking(created_at DESC);

ALTER TABLE public.visitor_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can upsert visitor tracking"
ON public.visitor_tracking FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update own visitor record"
ON public.visitor_tracking FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins view visitor tracking"
ON public.visitor_tracking FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete visitor tracking"
ON public.visitor_tracking FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_visitor_tracking_updated
BEFORE UPDATE ON public.visitor_tracking
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lucia_events
CREATE TABLE public.lucia_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  session_id text,
  user_id uuid,
  event_type text NOT NULL,
  product_id uuid,
  product_slug text,
  page text,
  source text,
  medium text,
  campaign text,
  country text,
  city text,
  device_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lucia_events_visitor ON public.lucia_events(visitor_id);
CREATE INDEX idx_lucia_events_session ON public.lucia_events(session_id);
CREATE INDEX idx_lucia_events_type ON public.lucia_events(event_type);
CREATE INDEX idx_lucia_events_source ON public.lucia_events(source);
CREATE INDEX idx_lucia_events_created ON public.lucia_events(created_at DESC);

ALTER TABLE public.lucia_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone inserts lucia events"
ON public.lucia_events FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Admins view lucia events"
ON public.lucia_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete lucia events"
ON public.lucia_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- chat_ai_sessions: nuevos campos
ALTER TABLE public.chat_ai_sessions
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS medium text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS consent_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS first_product_viewed text,
  ADD COLUMN IF NOT EXISTS last_product_viewed text;

CREATE INDEX IF NOT EXISTS idx_chat_ai_sessions_visitor ON public.chat_ai_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_ai_sessions_source ON public.chat_ai_sessions(source);
CREATE INDEX IF NOT EXISTS idx_chat_ai_sessions_country ON public.chat_ai_sessions(country);

-- chat_ai_messages: nuevos campos
ALTER TABLE public.chat_ai_messages
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS device_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS location_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chat_ai_messages_visitor ON public.chat_ai_messages(visitor_id);
