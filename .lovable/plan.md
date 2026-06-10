# Shalom Shipment Tracking — Nutribatidos

Implementación completa de seguimiento de envíos con Shalom API: secrets, base de datos, edge functions, panel admin, vista cliente con línea de progreso y cron de actualización automática.

## 1. Secrets (Supabase)

Solicitar al usuario via `add_secret`:
- `SHALOM_API_KEY`
- `SHALOM_EMAIL`
- `SHALOM_PASSWORD`

(Se piden antes de desplegar las edge functions.)

## 2. Base de datos (migration)

Nueva tabla `public.order_shipments` (relación 1:1 con `orders`, índice único por `order_id`):

```
id, order_id (FK orders), carrier_id (FK shipping_providers), carrier_code,
tracking_number, tracking_code, ose_id,
status_internal, status_external,
origin_name, destination_name,
registered_at, estimated_delivery_at, delivered_at,
last_event_title, last_event_description, last_event_date, last_event_time,
history_json (jsonb), raw_response (jsonb),
last_checked_at, error_message,
created_at, updated_at
```

RLS:
- `authenticated` puede SELECT cuando `order_id` pertenece a `auth.uid()` (vía join con `orders.user_id`).
- `admin` (has_role) puede ALL.
- `service_role` ALL (cron/edge functions).
- GRANTs explícitos a `authenticated` (SELECT) y `service_role` (ALL).

Trigger `update_updated_at_column` para `updated_at`.

Asegurar transportista Shalom: `INSERT ... ON CONFLICT` en `shipping_providers` (code `shalom`, name "Shalom", estimated_days "3–7 días hábiles", is_active true). Si la tabla no tiene columna `api_provider`, agregarla nullable.

## 3. Edge Functions

### `shalom-tracking-query` (verify_jwt = true, admin/owner-only)
Input: `{ order_id, numero?, codigo?, ose_id? }`
- Valida que el caller sea admin (vía `has_role`) o dueño del pedido.
- Si `ose_id` → `GET https://api.shalom-api-peru.com/v1/tracking/{ose_id}/events`
- Sino → `GET /v1/tracking?numero=...&codigo=...`
- Headers: `X-API-Key: SHALOM_API_KEY`. Si responde 401/403 con necesidad de sesión, hace `POST /v1/shalom/sessions` con email/password y reintenta con `Authorization: Bearer <session_token>` (cacheado en memoria del runtime).
- Mapea eventos → `status_internal` (ver tabla §4).
- Upsert en `order_shipments` (no borra datos previos si falla; setea `error_message` y `last_checked_at`).
- Devuelve el shipment normalizado.

### `shalom-tracking-cron` (verify_jwt = false, protegida por header `x-cron-secret`)
- Lista shipments con `carrier_code='shalom'` y status no terminal.
- Aplica throttling según `status_internal`:
  - `origen`/`transito`: refrescar si `last_checked_at` > 6h
  - `reparto`/`destino`: > 2h
  - `entregado`/`cancelado`/`devuelto`: skip
- Llama internamente la lógica de consulta (refactor en helper compartido dentro del archivo).
- Mantiene último estado si API falla.

Programar con `pg_cron` + `pg_net` cada hora (usando `supabase--insert` para crear el job, no migration).

## 4. Mapeo de estados

Función pura `mapShalomStatus(events, deliveredFlag)` → uno de:
`sin_tracking | preparando | origen | transito | demora | destino | reparto | entregado | cancelado | devuelto`

Heurística por palabras clave en `event.title/description` (en orden de prioridad: entregado > reparto > destino > demora > transito > origen > preparando).

## 5. Admin — detalle de pedido

`src/pages/admin/AdminOrderDetail.tsx`: nuevo bloque "Gestión de envío":
- Select transportista (lista activa de `shipping_providers`).
- Inputs: `tracking_number`, `tracking_code`, `ose_id`.
- Lectura de campos del shipment actual (estado, origen, destino, fechas, último movimiento, historial).
- Botón "Guardar tracking" → upsert directo en `order_shipments` (admin RLS).
- Botón "Actualizar tracking ahora" → invoca `shalom-tracking-query`.
- Render del historial (`history_json`) en lista.

## 6. Cliente — Mis pedidos

`src/pages/MyOrders.tsx`:
- Nueva columna "Envío" con badge según `status_internal` y `last_checked_at`.
- Fetch en paralelo: shipments con `order_id IN (...)`.

`src/pages/OrderDetail.tsx`:
- Nuevo bloque visual `ShipmentTracking` (nuevo componente `src/components/order/ShipmentTracking.tsx`):
  - Header: estado principal grande + n° de orden Shalom + última actualización.
  - Grid: origen, destino, fecha registro, fecha entrega.
  - Info envío: transportista, tracking, código, remitente, destinatario, contenido, pago (si vienen en raw).
  - **Línea de progreso** horizontal (En origen → En tránsito → En destino → Entregado) con steps activos. Demora en rojo destacado.
  - Historial: lista con fecha, hora, descripción, ubicación.
- Tokens semánticos (no hardcodear colores); rojo para demora vía `text-destructive`/`bg-destructive/10`.

## 7. Seguridad

- API key/email/password solo en edge functions (`Deno.env.get`).
- RLS asegura que cliente solo ve su shipment.
- `shalom-tracking-query` valida ownership/admin antes de cualquier acción.
- Errores técnicos no se exponen al cliente (mensaje genérico "Última actualización: ...").

## Archivos a crear/editar

Nuevos:
- `supabase/functions/shalom-tracking-query/index.ts`
- `supabase/functions/shalom-tracking-cron/index.ts`
- `src/components/order/ShipmentTracking.tsx`
- `src/hooks/useOrderShipment.ts`
- `src/lib/shalomStatus.ts` (mapeo + labels frontend)

Editados:
- `src/pages/admin/AdminOrderDetail.tsx`
- `src/pages/MyOrders.tsx`
- `src/pages/OrderDetail.tsx`
- `supabase/config.toml` (registrar nuevas functions si requieren override)

Migration + cron job vía `supabase--insert`.

## Orden de ejecución

1. Pedir secrets.
2. Migration (tabla + RLS + GRANTs + seed Shalom provider).
3. Edge functions + deploy.
4. Cron job (`supabase--insert` con `cron.schedule`).
5. UI admin + cliente.
6. Verificación (build, navegar a `/admin/orders/:id` y `/my-orders/:id`).
