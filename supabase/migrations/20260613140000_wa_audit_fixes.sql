-- =====================================================================
-- Correcciones auditoría:
--   A1  vista con security_invoker (no saltarse RLS)
--   M2  match teléfono -> cliente CRM (rellena profile_id)
--   M5  creación de conversación a prueba de carrera
-- =====================================================================

-- ---------- A1: la vista respeta el RLS de las tablas base ----------
ALTER VIEW public.wa_conversations_v SET (security_invoker = on);

-- ---------- M2 + M5: ingesta con match CRM y sin race ----------
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
  -- upsert contacto (no pisa el nombre existente)
  INSERT INTO public.wa_contacts (channel, wa_id, phone, name)
  VALUES (p_channel, p_wa_id, '+' || p_wa_id, p_name)
  ON CONFLICT (channel, wa_id)
    DO UPDATE SET name = COALESCE(public.wa_contacts.name, EXCLUDED.name)
  RETURNING id, profile_id INTO v_contact, v_profile;

  -- M2: si aún no está vinculado a un cliente, intenta match por teléfono
  -- (últimos 9 dígitos; móvil Perú). Solo vincula si el match es ÚNICO.
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

  -- M5: asegura conversación a prueba de carrera
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

  -- inserta mensaje (dedupe por channel+wa_message_id)
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
