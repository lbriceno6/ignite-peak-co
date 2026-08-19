UPDATE public.seo_landing_pages
SET hero_image = 'https://mphrhcuqzkbbnovmdbpc.supabase.co/storage/v1/object/public/blog-images/landings/beneficio-vitaminas-hero.png',
    hero_image_alt = COALESCE(NULLIF(trim(hero_image_alt), ''), 'Mujer saludable en una cocina luminosa con frutas y verduras, relacionada con vitaminas y bienestar diario'),
    hero_image_source = 'ai',
    hero_image_status = 'generated',
    hero_image_prompt = 'Imagen editorial realista y luminosa para el Hero de una landing de Nutribatidos sobre vitaminas y bienestar diario: persona saludable en cocina luminosa con frutas y verduras. Sin texto ni logos.',
    hero_image_generated_at = now(),
    updated_at = now()
WHERE slug = 'vitaminas' AND kind = 'beneficio';