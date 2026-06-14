-- =====================================================================
-- wa_ingest_inbound — camino único de ingesta de entrantes.
-- Lo usan TANTO el webhook de Meta (cloud) como el bridge de Baileys (qr).
-- service_role only. Upsert contacto + asegura conversación + inserta mensaje.
-- =====================================================================

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
  v_conv    uuid;
BEGIN
  INSERT INTO public.wa_contacts (channel, wa_id, phone, name)
  VALUES (p_channel, p_wa_id, '+' || p_wa_id, p_name)
  ON CONFLICT (channel, wa_id)
    DO UPDATE SET name = COALESCE(public.wa_contacts.name, EXCLUDED.name)
  RETURNING id INTO v_contact;

  SELECT id INTO v_conv FROM public.wa_conversations WHERE contact_id = v_contact;
  IF v_conv IS NULL THEN
    INSERT INTO public.wa_conversations (contact_id, channel, status)
    VALUES (v_contact, p_channel, 'open')
    RETURNING id INTO v_conv;
  END IF;

  INSERT INTO public.wa_messages
    (conversation_id, contact_id, channel, wa_message_id, direction, type, body, media_url, media_mime, status, raw)
  VALUES
    (v_conv, v_contact, p_channel, p_wa_message_id, 'in', p_type, p_body, p_media_url, p_media_mime, 'received', p_raw)
  ON CONFLICT DO NOTHING;   -- dedupe por (channel, wa_message_id)

  RETURN v_conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wa_ingest_inbound(text,text,text,text,text,text,text,text,jsonb) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.wa_ingest_inbound(text,text,text,text,text,text,text,text,jsonb) TO service_role;
