# Etapa 5 — SEO Inteligente: Producción, Analítica y Crecimiento

Una sola etapa muy grande. La divido en 10 bloques que cubren todos los puntos pedidos. Cada bloque es independiente y se entregará junto.

---

## 1. Ruta `/feeds/google-merchant.xml`

Ya quedó resuelto en el turno anterior con `public/_redirects` (rewrite 200 → edge function `merchant-feed`). Lo verifico y dejo nota en el panel Merchant del admin con la nueva URL pública (`https://nutribatidos.com/feeds/google-merchant.xml`).

---

## 2. Panel "Validación técnica" en `/admin/seo`

Nuevo tab **QA** que ejecuta verificaciones en tiempo real:

- HEAD/GET a `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feeds/google-merchant.xml`
- Conteo de productos con `schema_jsonld` (Product), landings con `schema_jsonld` (CollectionPage), productos con `og_image`
- Muestreo de 10 imágenes principales (HEAD) → reporta rotas
- Productos sin `canonical` o con `canonical` distinto a `/producto/{slug}`
- Cada check → estado ok / warn / fail + detalle expandible

Archivo: `src/components/admin/seo/QaTab.tsx`.

---

## 3. Integración de analítica

Nueva tabla `analytics_settings` (singleton id=1):

- `ga4_measurement_id`, `gtm_container_id`, `meta_pixel_id`, `google_ads_conversion_id`, `google_ads_conversion_label`, `enabled` booleano por cada uno.

Componente `<AnalyticsScripts/>` montado en `App.tsx` que inyecta dinámicamente los scripts (GA4 gtag, GTM, Meta Pixel) según los IDs configurados, con `<noscript>` para Pixel en `<body>` (cumple regla HTML5).

Pantalla de configuración: tab **Analytics** en `/admin/seo`.

Archivos: `src/components/AnalyticsScripts.tsx`, `src/lib/analytics.ts`, `src/components/admin/seo/AnalyticsTab.tsx`.

---

## 4. Eventos ecommerce

Helper `track(event, payload)` en `src/lib/analytics.ts` que despacha a GA4 (`gtag('event', ...)`), GTM (`dataLayer.push`) y Meta Pixel (`fbq('track', ...)`). 

Integración en:

- `ProductDetail.tsx` → `view_item`
- `Search.tsx` → `search`
- `ProductCard.tsx` → `select_item` (click) y `add_to_cart`
- `Checkout.tsx` → `begin_checkout`, `purchase` (al confirmar pedido + Google Ads conversion)
- `WhatsAppButton.tsx` → `whatsapp_click`
- `SeoLanding.tsx` → `landing_page_view`

---

## 5. Dashboard de rendimiento

Nueva tabla `product_events` (lightweight: id, event_type, product_id, landing_slug, user_id, session_id, created_at). Inserts desde el cliente vía RLS insert-only.

Tab **Performance** en `/admin/seo` con queries agregadas:

- Top productos por `view_item`, `search`, `add_to_cart`, `purchase` (joins a `orders`+`order_items` para compras reales)
- Top landings por `landing_page_view`
- Búsquedas internas sin resultados (de `search_logs` con `results_count=0`)
- Clics WhatsApp
- Conversión por producto = `purchase / view_item`
- Conversión por landing = `purchase asociadas / landing_page_view`

Archivo: `src/components/admin/seo/PerformanceTab.tsx`.

---

## 6. Gestor de contenidos SEO

Nueva tabla `seo_content_plan`:

- `kind` (blog | landing | faq | product_improvement | synonym | internal_link)
- `title`, `notes`, `payload` jsonb, `target_keyword`, `target_url`
- `status` (draft | review | approved | published)
- `due_date`, `created_by`

Tab **Contenidos** con tablero kanban simple (4 columnas) + CRUD inline.

Archivo: `src/components/admin/seo/ContentPlanTab.tsx`.

---

## 7. Generador mensual SEO con IA

Nueva edge function `seo-monthly-plan` (Lovable AI Gateway, modelo `google/gemini-2.5-flash`, tool-calling estructurado).

Devuelve JSON con: 4 blog posts, 5 landings, 10 FAQs, 20 keywords, 20 sinónimos, 10 mejoras de productos, 10 oportunidades de enlaces internos. Recibe contexto: top búsquedas sin resultado, productos peor ranqueados en SEO, landings actuales.

Botón "Generar plan SEO mensual" dentro de tab Contenidos → inserta todo como `status='draft'` en `seo_content_plan`.

---

## 8. Redirecciones SEO

Nueva tabla `seo_redirects` (from_path, to_path, status_code, active, created_at).

Componente `<RedirectGate/>` montado dentro del Router que, en cada cambio de ruta, consulta caché (precargada al boot) y hace `navigate(to_path, { replace: true })` si match. Para 301 reales se documenta usar `_redirects` en producción; en SPA hacemos rewrite client-side equivalente.

Tab **Redirecciones** con CRUD.

Archivos: `src/components/RedirectGate.tsx`, `src/components/admin/seo/RedirectsTab.tsx`.

---

## 9. Control de indexación

Columna ya existe (`noindex` en `seo_meta`). Añadir `robots_directive` text ('index,follow' | 'noindex,follow' | 'noindex,nofollow'). Actualizar `SeoFromMeta.tsx` para emitir `<meta name="robots" content="...">` según directiva.

UI: nuevo selector en `SeoEditor.tsx`.

---

## 10. Reporte general

Botón "Exportar reporte completo" en tab QA que genera CSV con todas las secciones combinadas (auditoría técnica + estados merchant/sitemap/schema/analytics + productos con errores + landings con errores + búsquedas sin resultado + oportunidades del content plan).

Archivo: `src/lib/seoFullReport.ts`.

---

## Detalle técnico (resumen)

**Migración única** con:
- `analytics_settings` (singleton, admin manage, public select para IDs públicos)
- `product_events` (insert público, select admin)
- `seo_content_plan` (admin manage, public select)
- `seo_redirects` (admin manage, public select para que el gate funcione sin auth)
- `seo_meta.robots_directive` columna nueva

**Edge function nueva**: `supabase/functions/seo-monthly-plan/index.ts` (LOVABLE_API_KEY, verify_jwt=true).

**Frontend nuevo**: 6 tabs admin + AnalyticsScripts + RedirectGate + helper analytics + 2 librerías helper.

**Frontend tocado**: `App.tsx`, `AdminSeo.tsx`, `SeoEditor.tsx`, `SeoFromMeta.tsx`, `ProductDetail.tsx`, `ProductCard.tsx`, `Search.tsx`, `Checkout.tsx`, `WhatsAppButton.tsx`, `SeoLanding.tsx`.

¿Procedo a implementarlo todo?
