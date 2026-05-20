# Etapa 6: Pruebas reales, monitoreo y producción

Alcance grande pero acotable. Construyo todo dentro de `/admin/seo` agregando tabs nuevos y reutilizando lo que ya existe (`QaTab`, `MerchantTab`, `RedirectsTab`, `FunnelTab`, `seoFullReport`, `analytics.ts`, `sensitiveClaims.ts`).

## 1. Tabs nuevos en AdminSeo

- **Production Tests** (`ProductionTestsTab.tsx`) — checks HTTP de sitemap.xml, sitemap-products/categories/blog/landings/static.xml, robots.txt, llms.txt, /feeds/google-merchant.xml + edge function. Verifica `Sitemap:` en robots, presencia de productos/categorías en llms.txt, títulos/descripciones duplicadas (query a `seo_meta`), productos sin canonical, URLs rotas. Estados OK/Warn/Error.
- **Events QA** (`EventsQaTab.tsx`) — lista últimos `product_events` con filtros por evento, fecha, producto, usuario; muestra payload completo (JSON), URL, sesión. Contadores por tipo (8 eventos esperados).
- **Analytics Debug** (`AnalyticsDebugTab.tsx`) — botones "Enviar test" a GA4 / GTM / Meta Pixel / Google Ads; muestra IDs configurados desde `analytics_config` (verde/rojo si faltan). Usa `window.gtag`, `dataLayer.push`, `fbq`.
- **Feed Validation** (mejora `MerchantTab` o crea `MerchantValidationTab.tsx`) — recorre productos aprobados y reporta: sin imagen, sin precio, sin stock, sin descripción, sin marca, sin categoría, URL/imagen inválida, caracteres XML mal escapados, precio formato incorrecto, availability inválida. Botón "Regenerar feed y validar ahora" llama a edge function merchant-feed y reanaliza.
- **Change History** (`ChangeHistoryTab.tsx`) — lee `seo_change_logs`, filtros por entity_type/field/usuario/fecha.
- **Alerts** (`AlertsTab.tsx`) — calcula en cliente alertas: errores feed (`merchant_feed_logs`), sitemap caído, productos importantes con score<70, productos publicados ausentes en sitemap o feed, páginas con noindex, productos sin precio/stock, búsquedas con muchos cero-resultados (`search_logs`).
- **Search Monitor** (mejora `SearchTab` o crea `SearchMonitorTab.tsx`) — términos más buscados / sin resultados / con clics / que generan carrito / compra; productos más encontrados, más clickeados, buscados pero no comprados. Joins entre `search_logs` y `product_events`.
- **Redirects Validator** (extensión a `RedirectsTab`) — añade botón "Validar" que detecta: loops (A→B→A), targets 404 (HEAD a to_path), `from_path` duplicados, `to_path` inválidos, status 301 vs 302.
- **Claims Scanner** (`ClaimsScannerTab.tsx`) — escanea `products.description/short_description`, `seo_landing_pages.intro_html`, `blog_posts.content`, `categories.description` con `scanSensitiveClaims`; muestra hit + sugerencia.
- **Production Checklist** (`ProductionChecklistTab.tsx`) — checklist 14 items con auto-detección donde posible (dominio, SSL implícito si HTTPS, sitemap servido, feed activo, analytics IDs presentes, productos publicados >0, páginas legales presentes en `seo_landing_pages` o rutas estáticas, contacto creado).
- **Reports** (en QA tab existente o sección dedicada) — botones export CSV/JSON por sección: SEO técnico, Feed, Eventos, Búsquedas, Claims, Redirecciones, No-indexables.

## 2. Base de datos

Migración: tabla `seo_change_logs` (id, entity_type, entity_id, field_changed, old_value, new_value, changed_by, changed_at) + RLS (admin select/insert) + índice por (entity_type, entity_id, changed_at desc).

Trigger en `seo_meta` que registra cambios en seo_title, seo_description, slug, canonical, robots_directive, schema_jsonld, shopping_title, shopping_description. Trigger en `seo_image_alts` (alt_text). Trigger en `seo_redirects` (from/to/active). Trigger en `products` (slug change).

## 3. AdminSeo.tsx

Agregar los 9 nuevos tabs al `<TabsList>` y `<TabsContent>`. Reorganizar tabs en grupos visuales si pasan de 15 (scroll horizontal en TabsList).

## Detalles técnicos

- Todos los checks HTTP usan `fetch` con AbortController y timeout 8s.
- Tab Reports importa `seoFullReport` y añade exportadores específicos.
- Trigger SQL usa `OLD IS DISTINCT FROM NEW` por campo, `auth.uid()` como changed_by.
- Production Tests valida duplicados con `select seo_title, count(*) from seo_meta group by seo_title having count(*)>1`.
- Analytics Debug lee `analytics_config` (asumo tabla existe del Stage 5; si no, lee de `window.__nbAnalyticsCfg`).
- Eventos QA filtra `product_events` por `event_type in (...)` con paginación 50.
- No toco esquemas Supabase reservados.

## Fuera de alcance

- No reescribo el edge function merchant-feed; sólo lo invoco.
- No agrego nuevos eventos analytics (ya implementados en etapa previa).
- No creo páginas legales nuevas; solo verifico existencia en checklist.