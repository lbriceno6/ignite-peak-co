INSERT INTO public.home_blocks (block_key, block_type, sort_order, is_active, eyebrow, title, subtitle, cta_label, cta_href, image_url)
SELECT 'nutrition_advisory', 'nutrition_advisory',
  COALESCE((SELECT MAX(sort_order) FROM public.home_blocks), 0) + 1,
  true,
  'Asesoría personalizada',
  'Nutribatidos + Asesoría nutricional',
  'Mejora tu alimentación con nutribatidos y orientación personalizada según tus objetivos.',
  'Escríbenos por WhatsApp',
  'https://wa.me/14155552671?text=Hola%2C%20quiero%20asesor%C3%ADa%20nutricional',
  null
WHERE NOT EXISTS (SELECT 1 FROM public.home_blocks WHERE block_key = 'nutrition_advisory');