# Plan: Tracking, consentimiento y atribución para Lucía

Implementación grande dividida en fases. Cada fase es independiente y verificable.

## Fase 1 — Base de datos

Migración única que crea/actualiza:

- **Tabla nueva `visitor_tracking`**: visitor_id, session_id, user_id, páginas (first/current/last), referrer, source/medium/campaign, UTMs, gclid/fbclid/ttclid, device_type/browser/os/language, country/region/city/timezone, consent_analytics/marketing/personalization, timestamps. RLS: admin lee todo, público puede insert/update por visitor_id.
- **Ampliar `chat_ai_sessions`**: visitor_id, referrer, source, medium, campaign, device_type, browser, os, country, city, timezone, consent_snapshot jsonb, landing_page, first_product_viewed, last_product_viewed.
- **Ampliar `chat_ai_messages`**: visitor_id, source, current_page, referrer, utm_data jsonb, device_data jsonb, location_data jsonb.
- **Tabla `lucia_events`**: id, visitor_id, session_id, event_type (lucia_chat_open, lucia_chat_message, lucia_product_recommendation, lucia_product_click, lucia_whatsapp_click, lucia_lead_captured), product_id, page, source, campaign, metadata jsonb, created_at. RLS: insert público, select admin.
- Índices por visitor_id, session_id, source, country, created_at.

## Fase 2 — Cliente: cookies, visitor_id y tracking

Archivos nuevos:

- `src/lib/consent.ts`: gestión de `cookie_consent` en localStorage + helpers `getConsent()`, `setConsent()`, `hasConsent(category)`.
- `src/lib/visitor.ts`: genera/lee `nutribatidos_visitor_id` (UUID, persistente) y `nutribatidos_session_id` (renovable por sesión, 30 min de inactividad).
- `src/lib/attribution.ts`: parsea URL (UTMs, gclid/fbclid/ttclid) y referrer → devuelve `{source, medium, campaign, ...}`. Persiste primera atribución en localStorage.
- `src/lib/device.ts`: detecta device_type, browser, os, language, timezone con `navigator` + `Intl`.
- `src/hooks/useVisitorTracking.ts`: en cada cambio de ruta hace upsert a `visitor_tracking` con los datos disponibles según consentimiento.

Componentes nuevos:

- `src/components/CookieBanner.tsx`: banner inferior con botones Aceptar todo / Rechazar / Configurar.
- `src/components/CookiePreferencesModal.tsx`: modal con switches por categoría (necesarias bloqueadas en true).
- Botón "Configurar cookies" añadido al `Footer.tsx`.

Integración en `App.tsx` / `Layout.tsx`: montar `CookieBanner` + `useVisitorTracking` global. `AnalyticsScripts` y pixels solo cargan si hay consentimiento correspondiente.

## Fase 3 — Lucía y edge function

- `LuciaChat.tsx`: al abrir, enviar evento `lucia_chat_open` con contexto completo. Al enviar mensaje, al hacer click en producto o WhatsApp, registrar eventos.
- `useLuciaContext.ts`: incluir visitor_id, session_id, source, device, location en el payload enviado a `ai-chat`.
- `supabase/functions/ai-chat/index.ts`: leer headers `x-forwarded-for`, `cf-ipcountry`, `user-agent`, `accept-language` y guardar país/IP server-side. Persistir en `chat_ai_sessions` y `chat_ai_messages` los campos nuevos. Nunca devolver IP al cliente.
- Helper `logLuciaEvent()` en cliente para insertar en `lucia_events`.

## Fase 4 — Admin: visitantes, atribución y conversación enriquecida

- `AdminChatAI.tsx`: añadir dos tabs nuevos.
  - **Visitantes y origen**: KPIs (totales, por fuente/campaña/país/ciudad/dispositivo/navegador), tablas de páginas y productos top. Filtros: fecha, fuente, campaña, país, ciudad, dispositivo, producto, página, proveedor, con WhatsApp, con compra.
  - **Atribución**: conversaciones / WhatsApp clicks / leads / recomendaciones por canal. Top campañas, páginas que activan Lucía, productos.
- Modal de conversación: cabecera enriquecida con nombre, teléfono, país/ciudad, dispositivo, navegador, fuente, campaña, primera página, página de apertura, producto, proveedor/modelo, estado de cookies, clic a WhatsApp.

## Fase 5 — Privacidad

- Página `/politica-de-cookies` y actualización de `/politica-de-privacidad` con: cookies usadas, finalidades, cómo cambiar preferencias, datos de Lucía, derechos del usuario.
- Footer: enlace a ambas + botón "Configurar cookies".

## Seguridad

- IP solo en logs server-side, nunca expuesta en `chat_ai_*` ni al frontend.
- Sin GPS, sin geolocation API.
- Consentimiento bloquea analytics/marketing/personalización.
- RLS en todas las tablas nuevas; insert público solo por visitor_id, select solo admin.

## Detalles técnicos

- Reutilizamos `chat_ai_settings.save_conversations` como gate adicional.
- `visitor_tracking` se upsertea por `visitor_id` (unique). `session_id` se actualiza en cada hit.
- Eventos `lucia_events` se insertan también si el usuario rechaza cookies (solo categoría "necesaria" = funcionamiento de Lucía), pero sin UTMs/device si no hay consentimiento de analytics.
- Atribución "first touch" persistente + "last touch" por sesión.

## Orden de ejecución

1. Migración (Fase 1) → esperar aprobación.
2. Helpers cliente + banner cookies (Fase 2).
3. Tracking + edge function (Fase 3).
4. Admin dashboards (Fase 4).
5. Páginas legales (Fase 5).
