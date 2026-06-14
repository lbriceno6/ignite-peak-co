-- =====================================================================
-- WhatsApp Inbox — módulo de bandeja de entrada propio (sin Chatwoot)
-- Agnóstico de canal: channel = 'cloud' (Meta Cloud API) | 'qr' (Evolution/Baileys)
-- RLS admin-only vía has_role(). Idempotente.
-- =====================================================================

-- ---------- 1) Contactos ----------
CREATE TABLE IF NOT EXISTS public.wa_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  wa_id           text NOT NULL,                 -- número internacional solo dígitos (ej: 51987654321)
  phone           text,                          -- display
  name            text,
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- link opcional al cliente CRM
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, wa_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_profile ON public.wa_contacts(profile_id);

-- ---------- 2) Conversaciones (1 hilo por contacto) ----------
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id           uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  channel              text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
  assigned_to          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_inbound_at      timestamptz,              -- ancla de la ventana de 24h (Cloud API)
  last_message_at      timestamptz,
  last_message_preview text,
  unread_count         integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_msg ON public.wa_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status   ON public.wa_conversations(status);

-- ---------- 3) Mensajes ----------
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'cloud' CHECK (channel IN ('cloud','qr')),
  wa_message_id   text,                          -- wamid de Meta (dedupe)
  direction       text NOT NULL CHECK (direction IN ('in','out')),
  type            text NOT NULL DEFAULT 'text',  -- text/image/audio/video/document/sticker/location/template/interactive
  body            text,
  media_url       text,
  media_mime      text,
  status          text NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','queued','sent','delivered','read','failed')),
  error           text,
  sent_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- asesor que envió (out)
  raw             jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.wa_messages(conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_waid
  ON public.wa_messages(channel, wa_message_id) WHERE wa_message_id IS NOT NULL;

-- ---------- 4) Trigger: al insertar mensaje, actualiza la conversación ----------
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

-- ---------- 5) Vista para el inbox (join contacto + estado de ventana 24h) ----------
CREATE OR REPLACE VIEW public.wa_conversations_v AS
SELECT
  c.id,
  c.contact_id,
  c.channel,
  c.status,
  c.assigned_to,
  c.last_inbound_at,
  c.last_message_at,
  c.last_message_preview,
  c.unread_count,
  c.created_at,
  ct.wa_id,
  ct.phone,
  ct.name,
  ct.profile_id,
  (c.last_inbound_at IS NOT NULL AND c.last_inbound_at > now() - interval '24 hours') AS window_open
FROM public.wa_conversations c
JOIN public.wa_contacts ct ON ct.id = c.contact_id;

-- ---------- 6) RLS (admin-only para lectura/edición; el service_role la salta) ----------
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

-- ---------- 7) Realtime ----------
ALTER TABLE public.wa_messages      REPLICA IDENTITY FULL;
ALTER TABLE public.wa_conversations REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
