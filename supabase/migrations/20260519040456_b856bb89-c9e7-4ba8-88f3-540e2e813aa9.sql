
CREATE POLICY "Users cancel own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('pending'::order_status, 'confirmed'::order_status)
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'::order_status
);
