INSERT INTO public.ai_block_toggles (block_key, enabled, label, description)
VALUES ('post_purchase_insights', true, 'Post-compra inteligente', 'Mensaje personalizado, próximos pasos y recordatorio de re-pedido en el detalle del pedido.')
ON CONFLICT (block_key) DO NOTHING;