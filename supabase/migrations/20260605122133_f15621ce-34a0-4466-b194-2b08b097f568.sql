UPDATE public.site_content SET value = 'Superalimentos andinos y fórmulas naturales para tu bienestar diario. Hechos en Perú, con la fuerza de siempre.' WHERE key = 'footer_description';
UPDATE public.site_content SET value = 'Únete a la comunidad' WHERE key = 'footer_newsletter_title';
UPDATE public.site_content SET value = 'Recibe 10% de descuento en tu primer pedido. Sin spam.' WHERE key = 'footer_newsletter_help';
UPDATE public.site_content SET value = 'Tienda' WHERE key = 'footer_col1_title';
UPDATE public.site_content SET value = 'Nosotros' WHERE key = 'footer_col2_title';
UPDATE public.site_content SET value = 'Ayuda' WHERE key = 'footer_col3_title';
UPDATE public.site_content SET value = '© {year} Nutribatidos. Todos los derechos reservados.' WHERE key = 'footer_copyright';

DELETE FROM public.hero_slides WHERE title = 'Take your performance to the next level';