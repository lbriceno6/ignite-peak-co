-- Restrict Realtime channel subscriptions so users can only subscribe to their own notification topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only subscribe to their own notification channel" ON realtime.messages;

CREATE POLICY "Users can only subscribe to their own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif:' || auth.uid()::text
);
