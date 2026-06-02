INSERT INTO public.ai_block_toggles (block_key, label, description) VALUES
  ('product_why_for_you', 'Producto · Por qué para ti', 'Bloque personalizado en la ficha del producto que explica por qué encaja con el visitante según sus señales.'),
  ('product_ai_related', 'Producto · Relacionados IA', 'Cross-sell IA en la ficha del producto que reemplaza el bloque "También te puede gustar" cuando la IA tiene contexto suficiente.')
ON CONFLICT (block_key) DO NOTHING;