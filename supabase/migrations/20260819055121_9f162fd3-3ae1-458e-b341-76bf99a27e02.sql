insert into public.seo_landing_pages
(kind, slug, keyword, category_name, title, intro, meta_title, meta_description, long_description,
 filter_field, filter_value, products_mode, is_published, status, source, hero_cta_label, sections, faqs, schema_jsonld)
values (
 'problema','dolor-de-espalda','dolor de espalda','Columna y espalda',
 'Dolor de espalda: causas, cuidados y nutrientes relacionados',
 'El dolor de espalda es una de las molestias más frecuentes y suele relacionarse con la postura, la actividad física y los hábitos diarios. Aquí encontrarás información educativa y nutrientes relacionados con el cuidado de músculos, huesos y articulaciones.',
 'Dolor de espalda: causas y nutrientes',
 'Conoce las causas más frecuentes del dolor de espalda, qué puedes hacer en tu día a día y qué nutrientes se relacionan con músculos y articulaciones.',
 'El cuidado de la espalda combina movimiento, descanso y una alimentación equilibrada. En Nutribatidos encontrarás productos naturales que pueden formar parte de tu rutina diaria de bienestar.',
 'category','Para tu salud','auto', false, 'draft','manual','Ver productos relacionados',
 jsonb_build_object(
   'what_is', jsonb_build_object('title','¿Qué es el dolor de espalda?','content','El dolor de espalda es una molestia que puede aparecer en la zona cervical, dorsal o lumbar. Suele relacionarse con la tensión muscular, la postura mantenida durante muchas horas o el esfuerzo físico.

En la mayoría de casos es una molestia pasajera que mejora con descanso, movimiento suave y hábitos saludables. Cuando es intensa o persistente, conviene consultar con un profesional de la salud.'),
   'causes', jsonb_build_array(
     jsonb_build_object('title','Mala postura','description','Permanecer muchas horas sentado o con la espalda encorvada puede generar tensión en la zona lumbar y cervical.'),
     jsonb_build_object('title','Tensión muscular','description','El estrés y la falta de descanso pueden aumentar la rigidez de los músculos de la espalda.'),
     jsonb_build_object('title','Sobrecarga física','description','Levantar peso sin la técnica adecuada o realizar esfuerzos repetidos puede sobrecargar la musculatura.'),
     jsonb_build_object('title','Sedentarismo','description','La falta de actividad física reduce la fuerza y la flexibilidad que ayudan a sostener la columna.')
   ),
   'symptoms', jsonb_build_array(
     jsonb_build_object('name','Rigidez'), jsonb_build_object('name','Dolor lumbar'),
     jsonb_build_object('name','Dolor cervical'), jsonb_build_object('name','Contracturas'),
     jsonb_build_object('name','Molestia al moverse')
   ),
   'what_to_do','Mantener actividad física suave y regular, cuidar la postura al trabajar y respetar las horas de descanso son hábitos que suelen acompañar el bienestar de la espalda.

Los estiramientos diarios, las pausas activas cada cierto tiempo y una hidratación adecuada forman parte de una rutina equilibrada. Si la molestia se mantiene, lo recomendable es acudir a un profesional de la salud.',
   'nutrition','Una alimentación equilibrada aporta nutrientes relacionados con el mantenimiento normal de los músculos, los huesos y el tejido conectivo.

Incluir proteínas de calidad, semillas, frutas, verduras y una buena hidratación forma parte de un estilo de vida saludable que acompaña el cuidado de la espalda.',
   'nutrients', jsonb_build_array(
     jsonb_build_object('name','Magnesio','slug','magnesio','description','Nutriente relacionado con el funcionamiento normal de los músculos.'),
     jsonb_build_object('name','Calcio','slug','calcio','description','Contribuye al mantenimiento de los huesos en condiciones normales.'),
     jsonb_build_object('name','Vitamina D','slug','vitamina-d','description','Participa en la absorción normal del calcio.'),
     jsonb_build_object('name','Colágeno','slug','colageno','description','Proteína presente en el tejido conectivo del organismo.'),
     jsonb_build_object('name','Omega 3','slug','omega-3','description','Ácidos grasos que forman parte de una alimentación equilibrada.')
   ),
   'ingredients', jsonb_build_array(
     jsonb_build_object('name','Chía','slug','chia','description','Semilla con aporte de fibra y ácidos grasos.'),
     jsonb_build_object('name','Quinua','slug','quinua','description','Cereal andino con aporte proteico.'),
     jsonb_build_object('name','Kiwicha','slug','kiwicha','description','Grano andino tradicional del Perú.'),
     jsonb_build_object('name','Ajonjolí','slug','ajonjoli','description','Semilla utilizada en preparaciones nutritivas.'),
     jsonb_build_object('name','Maca','slug','maca','description','Raíz andina usada tradicionalmente en la alimentación.')
   ),
   'related_topics', jsonb_build_array(
     jsonb_build_object('name','Dolor cervical','slug','dolor-cervical'),
     jsonb_build_object('name','Dolor lumbar','slug','dolor-lumbar'),
     jsonb_build_object('name','Hernia discal','slug','hernia-discal'),
     jsonb_build_object('name','Artrosis','slug','artrosis'),
     jsonb_build_object('name','Dolor de rodilla','slug','dolor-de-rodilla')
   ),
   'professional_help','Si la molestia es intensa, persistente, aparece después de una lesión o está acompañada de otros síntomas importantes, es recomendable consultar con un profesional de la salud.'
 ),
 jsonb_build_array(
   jsonb_build_object('q','¿Por qué aparece el dolor de espalda?','a','Suele relacionarse con la postura, la tensión muscular, el sedentarismo o los esfuerzos físicos. Un profesional de la salud puede evaluar cada caso.'),
   jsonb_build_object('q','¿La alimentación influye en el cuidado de la espalda?','a','Una alimentación equilibrada aporta nutrientes relacionados con el mantenimiento normal de músculos y huesos, como parte de un estilo de vida saludable.'),
   jsonb_build_object('q','¿Qué nutrientes se relacionan con músculos y huesos?','a','El magnesio, el calcio, la vitamina D, las proteínas y el colágeno son nutrientes habitualmente asociados al mantenimiento normal de músculos, huesos y tejido conectivo.'),
   jsonb_build_object('q','¿Los productos de Nutribatidos sustituyen un tratamiento?','a','No. Son productos alimenticios que forman parte de una alimentación equilibrada y no sustituyen la evaluación ni el tratamiento de un profesional de la salud.')
 ),
 null
)
on conflict (kind, slug) do nothing;