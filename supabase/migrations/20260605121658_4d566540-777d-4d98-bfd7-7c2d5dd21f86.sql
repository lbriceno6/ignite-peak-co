UPDATE public.purchase_intents
SET keywords = ARRAY['articulaciones','rodilla','dolor articular','huesos','cartilago','cartílago']
WHERE slug = 'articulaciones';

UPDATE public.purchase_intents
SET is_active = false
WHERE slug IN ('control_peso','masa_muscular','bienestar_general','piel_cabello_unas');