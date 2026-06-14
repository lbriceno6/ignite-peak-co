-- ===== 20260613120000_wa_inbox.sql =====
CREATE TABLE IF NOT EXISTS public.wa_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  wa_id           text NOT NULL,
  phone           text,
  name            text,
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, wa_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_profile ON public.wa_contacts(profile_id);

CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id           uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  channel              text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
  assigned_to          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_inbound_at      timestamptz,
  last_message_at      timestamptz,
  last_message_preview text,
  unread_count         integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.wa_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status   ON public.wa_conversations(status);

CREATE TABLE IF NOT EXISTS public.wa_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  wa_message_id   text,
  direction       text NOT NULL CHECK (direction IN ('in','out')),
  type            text NOT NULL DEFAULT 'text',
  body            text,
  media_url       text,
  media_mime      text,
  status          text NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','queued','sent','delivered','read','failed')),
  error           text,
  sent_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  raw             jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.wa_messages(conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_waid
  ON public.wa_messages(channel, wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wa_bump_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wa_conversations c
     SET last_message_at     = NEW.created_at,
         last_message_preview = left(coalesce(NEW.body, '['||NEW.type||']'), 120),
         last_inbound_at = CASE WHEN NEW.direction = 'in' THEN NEW.created_at ELSE c.last_inbound_at END,
         unread_count    = CASE WHEN NEW.direction = 'in' THEN c.unread_count + 1 ELSE c.unread_count END,
         status          = CASE WHEN NEW.direction = 'in' AND c.status = 'closed' THEN 'open' ELSE c.status END
   WHERE c.id = NEW.conversation_id;

  UPDATE public.wa_contacts
     SET last_message_at = NEW.created_at
   WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_bump ON public.wa_messages;
CREATE TRIGGER trg_wa_bump
  AFTER INSERT ON public.wa_messages
  FOR EACH ROW EXECUTE FUNCTION public.wa_bump_conversation();

CREATE OR REPLACE VIEW public.wa_conversations_v AS
SELECT
  c.id, c.contact_id, c.channel, c.status, c.assigned_to,
  c.last_inbound_at, c.last_message_at, c.last_message_preview,
  c.unread_count, c.created_at,
  ct.wa_id, ct.phone, ct.name, ct.profile_id,
  (c.last_inbound_at IS NOT NULL AND c.last_inbound_at > now() - interval '24 hours') AS window_open
FROM public.wa_conversations c
JOIN public.wa_contacts ct ON ct.id = c.contact_id;

ALTER TABLE public.wa_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa admin contacts" ON public.wa_contacts;
CREATE POLICY "wa admin contacts" ON public.wa_contacts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "wa admin conversations" ON public.wa_conversations;
CREATE POLICY "wa admin conversations" ON public.wa_conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "wa admin messages" ON public.wa_messages;
CREATE POLICY "wa admin messages" ON public.wa_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_contacts      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_messages      TO authenticated;
GRANT SELECT ON public.wa_conversations_v TO authenticated;
GRANT ALL ON public.wa_contacts, public.wa_conversations, public.wa_messages TO service_role;

ALTER TABLE public.wa_messages      REPLICA IDENTITY FULL;
ALTER TABLE public.wa_conversations REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 20260613130000_wa_ingest_fn.sql (superseded immediately by audit fix, but kept for parity) =====
-- (función definida más abajo en la versión final)

-- ===== 20260613140000_wa_audit_fixes.sql =====
ALTER VIEW public.wa_conversations_v SET (security_invoker = on);

CREATE OR REPLACE FUNCTION public.wa_ingest_inbound(
  p_channel       text,
  p_wa_id         text,
  p_name          text,
  p_wa_message_id text,
  p_type          text,
  p_body          text,
  p_media_url     text,
  p_media_mime    text,
  p_raw           jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact uuid;
  v_profile uuid;
  v_conv    uuid;
  v_cnt     int;
  v_match   uuid;
BEGIN
  INSERT INTO public.wa_contacts (channel, wa_id, phone, name)
  VALUES (p_channel, p_wa_id, '+' || p_wa_id, p_name)
  ON CONFLICT (channel, wa_id)
    DO UPDATE SET name = COALESCE(public.wa_contacts.name, EXCLUDED.name)
  RETURNING id, profile_id INTO v_contact, v_profile;

  IF v_profile IS NULL THEN
    SELECT count(*), min(pr.id) INTO v_cnt, v_match
    FROM public.profiles pr
    WHERE pr.phone IS NOT NULL
      AND length(regexp_replace(pr.phone, '\D', '', 'g')) >= 9
      AND right(regexp_replace(pr.phone, '\D', '', 'g'), 9) = right(p_wa_id, 9);
    IF v_cnt = 1 THEN
      UPDATE public.wa_contacts SET profile_id = v_match
       WHERE id = v_contact AND profile_id IS NULL;
    END IF;
  END IF;

  SELECT id INTO v_conv FROM public.wa_conversations WHERE contact_id = v_contact;
  IF v_conv IS NULL THEN
    BEGIN
      INSERT INTO public.wa_conversations (contact_id, channel, status)
      VALUES (v_contact, p_channel, 'open')
      RETURNING id INTO v_conv;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_conv FROM public.wa_conversations WHERE contact_id = v_contact;
    END;
  END IF;

  INSERT INTO public.wa_messages
    (conversation_id, contact_id, channel, wa_message_id, direction, type, body, media_url, media_mime, status, raw)
  VALUES
    (v_conv, v_contact, p_channel, p_wa_message_id, 'in', p_type, p_body, p_media_url, p_media_mime, 'received', p_raw)
  ON CONFLICT DO NOTHING;

  RETURN v_conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wa_ingest_inbound(text,text,text,text,text,text,text,text,jsonb) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.wa_ingest_inbound(text,text,text,text,text,text,text,text,jsonb) TO service_role;