# Plan de estabilización Nutribatidos

El alcance es muy grande para una sola iteración. Propongo trabajarlo en **olas** priorizadas. Cada ola es una entrega revisable y desplegable por separado. Confirma o ajusta antes de empezar.

## Ola 1 — Branding y base (rápido, alto impacto)
**Fase 1 del pedido.**
- index.html: ya dice "Nutribatidos", solo falta verificar/ajustar título sugerido y description.
- Reemplazar `Voltra Nutrition` en:
  - `supabase/functions/_shared/transactional-email-templates/*` (3 archivos, SITE_NAME).
  - `supabase/functions/send-order-email/index.ts` (prompt por defecto).
  - Migración de `footer_copyright` con un UPDATE a `site_content`.
- Las claves de localStorage `voltra.*` (cart, currency, referral, sidebarLabels) **las dejo como están** — renombrarlas borraría carritos y sesiones de usuarios actuales. Si quieres renombrarlas, lo hago con migración suave (leer vieja → escribir nueva).
- Verificar Footer/Header/Layout/SEO defaults.

## Ola 2 — Bloques IA del Home, advertencias de coherencia
**Fase 2.**
- Auditar `home_blocks` vs `ai_block_toggles` vs render de `Index.tsx`.
- Insertar filas faltantes para `ai_dynamic_banner`, `ai_recommended_for_you`, `ai_recently_viewed` si no existen.
- En `/admin/home-blocks` y `/admin/ia-control` mostrar badge de inconsistencia con los dos mensajes pedidos.

## Ola 3 — Vistos recientemente + diagnóstico
**Fase 3.**
- Verificar `ProductDetail` → `logBrowseEvent("browse_product_view", { product_slug, category_slug })` y escritura a `recently_viewed_products` en localStorage.
- Asegurar lectura consistente en `AiRecentlyViewed`.
- Panel de diagnóstico en admin con todos los campos pedidos (historial, slugs, matches, toggles, motivo) y botón **Simular producto visto**.

## Ola 4 — Banner dinámico IA + diagnóstico de intención
**Fase 4.**
- Revisar `detectVisitorIntent`, `resolveCurrentIntent`, threshold, fallback, hideIfNoSignal.
- Panel de diagnóstico ampliado (señales, categorías, búsquedas, intención, confianza, banner aplicado, motivo).
- Botón **Probar en Home** que inyecta señal temporal en localStorage y redirige.

## Ola 5 — Banners por intención (contenido base + storage)
**Fase 5.**
- Verificar bucket `brand-assets` existe y es público con políticas correctas.
- Validar URL pública, preview en admin, render en Home, manejo de error de imagen.
- Seed inicial de las 10 intenciones con los textos exactos que entregaste (energia, digestion, control_peso, articulaciones, colageno, masa_muscular, fitness, defensas, piel_cabello_unas, bienestar_general) solo si la tabla está vacía o falta el slug.

## Ola 6 — Buscador IA
**Fase 6.**
- Confirmar permisos de `/admin/buscador-ia` y guardado.
- Auditar que ninguna API key viva en la base — solo en Secrets.
- Verificar Edge `intelligent-search` cubre las 7 necesidades de ejemplo.
- Flujo "sin resultados": sugerencias + botón WhatsApp + log `search_no_results`.
- Eventos `browse_search`, `search_result_click`, `search_no_results`.

## Ola 7 — Lucía IA
**Fase 7.**
- Revisar `LuciaChat`, `ai-chat`, `LuciaProductCard`, `chat_ai_*`.
- Panel de prueba en admin: "Probar con producto actual", "Probar con búsqueda libre", "Ver última respuesta", "Ver productos recomendados".
- Reglas: no inventar productos, no curaciones, no diagnóstico médico (system prompt + guardrails).

## Ola 8 — Panel IA y métricas
**Fase 8.**
- `/admin/ia-control` con bloques, eventos (browse_product_view, browse_category_view, browse_search, add_to_cart), únicos vs con señales, intenciones top, clicks IA, conversiones IA.
- Alertas exactamente como pedidas.

## Ola 9 — Motor IA central
**Fase 9.**
- Crear `supabase/functions/_shared/ai-provider.ts` con `callAI`, `getProviderConfig`, `validateProviderSecret`, `normalizeAIError`, `safeJsonParse`.
- Soportar Lovable Gateway (default), Gemini, OpenAI, DeepSeek, Claude.
- Migrar progresivamente `ai-chat`, `intelligent-search`, `ai-product-seo-optimize`, `ai-prompt-optimizer` (una por una, con prueba después de cada migración).
- Pantalla **Verificar Secrets IA** que solo muestra "configurado/no configurado".

## Ola 10 — Analítica IA conversacional (módulo nuevo)
**Fase 10.**
- Nueva ruta `/admin/ia-insights` con UI tipo chat.
- Edge function que ejecuta queries pre-validadas (no SQL libre) sobre `lucia_events`, `products`, `orders`, `order_items`, `chat_ai_*`, `search_logs`, `promotions`.
- Modelo razona sobre los datos devueltos, no genera SQL.
- Salida: resumen, datos usados, recomendación accionable, enlaces.
- Mensaje claro cuando faltan datos.

## Ola 11 — Optimizador de búsqueda
**Fase 11.**
- Nueva ruta `/admin/search-optimizer`.
- Tabla nueva `search_synonyms` (term, synonyms, boost_product_ids, related_intent, related_category).
- Vistas: top búsquedas, búsquedas sin resultado, conversion por término.
- Acción: crear sinónimo, priorizar productos, asociar intención/categoría.

## Ola 12 — WhatsApp tienda básica
**Fase 12.**
- Helpers de mensaje prellenado por producto / intención / carrito.
- Botones "Comprar por WhatsApp", "Consultar por WhatsApp", "Enviar mi carrito".
- Eventos `whatsapp_*_click`.

## Ola 13 — QA de los 10 casos
**Fase 13.**
- Ejecutar manualmente los 10 escenarios y dejar checklist en `.lovable/qa-ia.md`.

## Detalles técnicos relevantes

- Toda mutación de Edge Function pasa por `LOVABLE_API_KEY` (ya configurado), nunca por keys directas en el frontend.
- Tablas nuevas (search_synonyms y posiblemente intent_banners ya existe) llevan GRANT + RLS según pattern del proyecto.
- Nada de SQL libre desde IA. La analítica IA usa queries parametrizadas server-side.
- Diagnóstico en admin: componentes con `useEffect` que leen localStorage + Supabase y muestran en vivo, sin persistir.

## Lo que NO haré salvo que lo pidas

- Renombrar las keys `voltra.*` de localStorage (rompería sesiones activas).
- Cambiar el dominio o slug `ignite-peak-co.lovable.app`.
- Mover proveedores de pago, shipping o auth.
- Borrar el contenido existente en `intent_banners` aunque haya inconsistencias — solo insertar lo faltante.

## Lo que necesito de ti

1. **Confirma el orden de olas.** ¿Quieres exactamente este orden o reordenamos? (Ej.: muchos clientes priorizan Ola 1 + Ola 5 + Ola 6 primero porque son las que ve el visitante final.)
2. **Olas 10 y 11 son módulos nuevos grandes.** ¿Las hago completas ahora o las dejamos para una segunda iteración una vez que 1-9 estén estables?
3. **¿Puedo empezar a ejecutar la Ola 1 ahora mismo** mientras decides el resto? Es bajo riesgo y deja el branding correcto en producción.
