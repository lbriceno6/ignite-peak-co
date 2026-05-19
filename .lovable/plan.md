# Plan: Módulo Revendedor

Sistema híbrido (link de afiliado + código de descuento), auto-registro inmediato, comisión por niveles (Bronce/Plata/Oro) y pago a elección (efectivo o saldo en tienda).

## 1. Base de datos

**Nuevas tablas:**
- `reseller_tiers`: `name`, `min_sales` (umbral $), `commission_percent`, `customer_discount_percent` (descuento que da el código al cliente), `sort_order`. Seed inicial: Bronce 0$/5%, Plata 500$/8%, Oro 2000$/12%.
- `resellers`: `user_id` (UNIQUE), `code` (UNIQUE, generado), `link_slug` (UNIQUE), `tier_id`, `total_sales` (acum.), `balance_cash` (a pagar), `balance_credit` (saldo tienda), `payout_method` ('cash'|'credit'|'choose'), `payout_account` (banco/wallet), `is_active`.
- `reseller_referrals`: `reseller_id`, `order_id`, `source` ('link'|'code'), `subtotal`, `commission_percent`, `commission_amount`, `status` ('pending'|'approved'|'paid'|'cancelled').
- `reseller_payouts`: `reseller_id`, `amount`, `method` ('cash'|'credit'), `status` ('requested'|'approved'|'paid'|'rejected'), `notes`, `processed_by`, `processed_at`.

**Cambios a tablas existentes:**
- `orders`: agregar `reseller_id`, `referral_source`, `reseller_discount_applied`, `store_credit_used`.

**Funciones/triggers:**
- `recalc_reseller_tier(reseller_id)`: recalcula tier según `total_sales`.
- Trigger en `orders` cuando `status` pasa a `confirmed`/`delivered`: crea fila en `reseller_referrals` con la comisión, suma a `total_sales`, recalcula tier, acumula `balance_cash` o `balance_credit` según `payout_method`.
- Función `apply_reseller_code(code)`: devuelve descuento aplicable.

**RLS:**
- `resellers`: el dueño ve/edita lo suyo; admin todo.
- `reseller_referrals`: dueño ve las suyas; admin todo.
- `reseller_payouts`: dueño crea solicitudes y ve las suyas; admin aprueba.
- `reseller_tiers`: lectura pública (para mostrar la tabla); escritura admin.

## 2. Auto-registro (cliente)

- Botón **"Activar plan revendedor"** en `MyProfile` → llama RPC que crea fila en `resellers` con código aleatorio (6 chars) y `link_slug` (uuid corto).
- Nuevo `useReseller()` hook expone `reseller`, `isReseller`.

## 3. Panel del revendedor

Nueva ruta `/reseller` (protegida, sólo si tiene fila en `resellers`) con sidebar similar a supplier:

- **Dashboard**: tarjetas con tier actual, próximo tier (con barra de progreso), ventas acumuladas, comisión total ganada, balance disponible.
- **Mi link y código**: muestra link `https://.../?ref=LINK_SLUG`, código `CODE` con botones copiar/compartir (WhatsApp, X, FB). QR del link.
- **Ventas**: tabla de `reseller_referrals` con pedido, fecha, fuente, comisión, estado.
- **Pagos**: botón "Solicitar retiro" (elige monto y método cash/credit), historial de `reseller_payouts`.
- **Configuración**: método de pago preferido y datos bancarios/wallet.

## 4. Tracking en la tienda

- Componente `ReferralTracker` montado en App.tsx: lee `?ref=` de la URL, lo guarda en `localStorage` (cookie 30 días).
- Componente `ResellerCodeInput` en `Cart`/`Checkout`: el cliente puede pegar un código manualmente.
- En `Checkout`, al crear la orden:
  - Si hay `ref` válido (link o código) → `orders.reseller_id`, `referral_source`, y aplica `customer_discount_percent` si es código.
  - Si el cliente tiene `balance_credit` propio (es revendedor también) → opción "Usar mi saldo en tienda" descuenta hasta el total.

## 5. Admin

- `/admin/resellers`: tabla con todos, filtros por tier, búsqueda, ver detalle (ventas, balance, ajustar tier manual).
- `/admin/reseller-tiers`: CRUD de niveles (umbral, % comisión, % descuento).
- `/admin/reseller-payouts`: bandeja de solicitudes, aprobar/rechazar/marcar pagado. Al aprobar 'credit' acredita `balance_credit` y descuenta `balance_cash` automáticamente.
- Sidebar admin: nueva sección **"Revendedores"** agrupando estas 3 vistas.

## 6. Vista pública / marketing

- Página `/programa-revendedor` (landing): cómo funciona, tabla de niveles dinámica desde `reseller_tiers`, CTA "Activar mi plan" (lleva a auth si no logueado, sino a `/reseller`).
- Link en footer "Gana con nosotros".

## Detalles técnicos

**Cálculo de comisión** (en trigger):
```
commission = subtotal * tier.commission_percent / 100
```
El descuento del cliente con código se aplica sobre `subtotal` antes de comisión, así no se canibalizan.

**Distribución del balance**:
- `payout_method='cash'` → todo a `balance_cash`
- `payout_method='credit'` → todo a `balance_credit`
- `payout_method='choose'` → queda en `balance_cash` y el revendedor decide al solicitar

**Uso de saldo en tienda** (`balance_credit`): se descuenta al confirmar el pedido vía trigger.

**Códigos únicos**: generados con `substring(md5(random()::text), 1, 6)` reintentando si choca.

## Archivos a crear/tocar

- `supabase/migrations/..._reseller_module.sql` (todo el bloque)
- `src/context/AuthContext.tsx` (exponer `isReseller`, `resellerId`)
- `src/hooks/useReseller.ts` (nuevo)
- `src/components/ResellerRoute.tsx` (nuevo)
- `src/components/reseller/ResellerLayout.tsx` (nuevo)
- `src/components/ReferralTracker.tsx` (nuevo, montado en App)
- `src/pages/reseller/ResellerDashboard.tsx`, `ResellerLink.tsx`, `ResellerSales.tsx`, `ResellerPayouts.tsx`, `ResellerSettings.tsx` (nuevos)
- `src/pages/ResellerProgram.tsx` (landing, nuevo)
- `src/pages/admin/AdminResellers.tsx`, `AdminResellerTiers.tsx`, `AdminResellerPayouts.tsx` (nuevos)
- `src/pages/MyProfile.tsx` (botón activar)
- `src/pages/Checkout.tsx` (aplicar referido y saldo)
- `src/pages/Cart.tsx` (input código)
- `src/App.tsx` (rutas + ReferralTracker)
- `src/components/admin/AdminLayout.tsx` (menú Revendedores)
- `src/components/Footer.tsx` (link al programa)

## Fuera de alcance (avísame si lo quieres después)

- Pagos automáticos a banco/Stripe Connect (el admin marca como pagado manualmente).
- Sub-revendedores / multinivel (MLM).
- Notificaciones email a revendedor por cada venta (se pueden agregar después con la infra existente de `enqueue_email`).
- Productos exclusivos por tier.
