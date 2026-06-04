
ALTER TABLE public.purchase_intents ADD COLUMN IF NOT EXISTS eyebrow text;

INSERT INTO public.purchase_intents (slug, name, title, subtitle, cta_text, cta_url, eyebrow, keywords, category_slugs, priority, is_active)
VALUES
  ('energia', 'Energía', 'Energía natural para tu día', 'Descubre productos ideales para mantenerte activo y sentirte mejor.', 'Ver productos', '/objetivo/energia', 'Recomendado para ti', ARRAY['energia','energy','vitalidad','maca'], ARRAY[]::text[], 10, true),
  ('digestion', 'Digestión', 'Apoya tu bienestar digestivo', 'Productos naturales para sentirte más ligero y equilibrado.', 'Ver digestión', '/objetivo/digestion', 'Bienestar diario', ARRAY['digestion','digestivo','probiotico','fibra'], ARRAY[]::text[], 20, true),
  ('control_peso', 'Control de peso', 'Acompaña tu objetivo de control de peso', 'Suplementos y snacks pensados para tu rutina saludable.', 'Ver control de peso', '/objetivo/control-peso', 'Hecho para ti', ARRAY['peso','adelgazar','quemador','control de peso'], ARRAY[]::text[], 30, true),
  ('articulaciones', 'Articulaciones', 'Cuida tus articulaciones', 'Encuentra fórmulas para apoyar la movilidad y el confort articular.', 'Ver articulaciones', '/objetivo/articulaciones', 'Movimiento sin límites', ARRAY['articulaciones','colageno','glucosamina'], ARRAY[]::text[], 40, true),
  ('colageno', 'Colágeno', 'Cuida tu piel y articulaciones', 'Encuentra colágenos y aliados para tu bienestar diario.', 'Ver colágenos', '/categoria/colagenos', 'Según tu interés', ARRAY['colageno','collagen','piel'], ARRAY['colagenos'], 50, true),
  ('masa_muscular', 'Masa muscular', 'Construye masa muscular de forma natural', 'Proteínas y aminoácidos para apoyar tu entrenamiento.', 'Ver proteínas', '/objetivo/masa-muscular', 'Para tu rutina', ARRAY['masa muscular','proteina','whey','musculo'], ARRAY[]::text[], 60, true),
  ('fitness', 'Fitness', 'Lleva tu fitness al siguiente nivel', 'Suplementos pre y post entreno para acompañar tu disciplina.', 'Ver fitness', '/objetivo/fitness', 'Recomendado para ti', ARRAY['fitness','pre entreno','bcaa','creatina'], ARRAY[]::text[], 70, true),
  ('defensas', 'Defensas', 'Fortalece tus defensas', 'Vitaminas y antioxidantes para tu sistema inmune.', 'Ver defensas', '/objetivo/defensas', 'Cuídate cada día', ARRAY['defensas','inmune','vitamina c','zinc'], ARRAY[]::text[], 80, true),
  ('piel_cabello_unas', 'Piel, cabello y uñas', 'Belleza desde adentro', 'Nutrientes que cuidan tu piel, cabello y uñas.', 'Ver belleza', '/objetivo/piel-cabello-unas', 'Tu rutina de belleza', ARRAY['piel','cabello','uñas','biotina'], ARRAY[]::text[], 90, true),
  ('bienestar_general', 'Bienestar general', 'Bienestar para todos los días', 'Productos esenciales para tu rutina de salud integral.', 'Ver productos', '/productos', 'Esenciales para ti', ARRAY['bienestar','salud','multivitamínico'], ARRAY[]::text[], 100, true)
ON CONFLICT (slug) DO NOTHING;
