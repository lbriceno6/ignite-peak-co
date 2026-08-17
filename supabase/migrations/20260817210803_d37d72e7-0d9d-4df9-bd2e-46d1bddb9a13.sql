
-- combo_events: restrict client inserts
DROP POLICY IF EXISTS "Insert combo events with own user_id" ON public.combo_events;
CREATE POLICY "Client inserts combo events (no order spoofing)"
ON public.combo_events FOR INSERT TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) OR (user_id = auth.uid()))
  AND event_type IN ('view','cart_add')
  AND order_id IS NULL
  AND amount IS NULL
  AND (source_location IS NULL OR length(source_location) <= 64)
  AND EXISTS (SELECT 1 FROM public.combos c WHERE c.id = combo_id)
);

-- chat_ai_feedback: require an existing session and matching message
DROP POLICY IF EXISTS "Anyone inserts feedback" ON public.chat_ai_feedback;
CREATE POLICY "Insert feedback for existing session"
ON public.chat_ai_feedback FOR INSERT TO anon, authenticated
WITH CHECK (
  rating IN ('up','down','positive','negative')
  AND (comment IS NULL OR length(comment) <= 1000)
  AND EXISTS (SELECT 1 FROM public.chat_ai_sessions s WHERE s.session_id = chat_ai_feedback.session_id)
  AND (
    message_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.chat_ai_messages m
      WHERE m.id = chat_ai_feedback.message_id
        AND m.session_id = chat_ai_feedback.session_id
    )
  )
);
