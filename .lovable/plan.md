Convertiré la tienda en un **marketplace multi-vendedor** con auto-registro de proveedores (con aprobación), publicación directa, pedido único con comisión, y vista pública por proveedor.

## 1. Base de datos (migración)

**Rol nuevo y suppliers ampliado**
- Añadir valor `'supplier'` al enum `public.app_role`.
- Ampliar tabla `suppliers` con: `user_id uuid UNIQUE` (vincula al usuario auth), `slug text UNIQUE`, `status text` (`pending` / `approved` / `suspended`, default `pending`), `logo_url`, `description text`, `commission_percent numeric default 15`, `payout_method text`, `payout_account text`, `tax_id text`.
- Crear "Proveedor casa" Nutribatidos (`is_house=true`) y reasignar todos los productos sin proveedor a este registro.

**Productos**
- Mantener `supplier_id` (ya existe). Hacerlo `NOT NULL` tras la migración de datos.
- Reescribir RLS de `products`:
  - Público: ver activos cuyo supplier esté `approved`.
  - Admin: todo.
  - Supplier aprobado: CRUD sobre filas con su `supplier_id` (via security-definer `current_supplier_id()`).

**Order items con comisión**
- Añadir a `order_items`: `supplier_id uuid`, `commission_percent numeric`, `commission_amount numeric`, `supplier_payout numeric`, `fulfillment_status text default 'pending'` (`pending` / `shipped` / `delivered`), `tracking_number text`.
- Al insertar un item se calcula y se persiste comisión (vía trigger BEFORE INSERT que toma `commission_percent` actual del supplier).
- RLS: supplier puede `SELECT` y `UPDATE fulfillment_status / tracking_number` de items con su `supplier_id`. Admin lo ve todo.

**Funciones de seguridad**
- `current_supplier_id()` SECURITY DEFINER → devuelve el `suppliers.id` aprobado del `auth.uid()` actual.
- `is_supplier()` helper.
- `handle_new_user` no cambia (todos siguen creándose como `client`; el rol `supplier` se asigna al aprobar).

## 2. Auth y rutas

- `useAuth`: añadir `isSupplier`, `supplierId`, `supplierStatus`.
- Nuevo guard `SupplierRoute` (requiere rol `supplier` y status `approved`; si está `pending` muestra pantalla "Tu cuenta está en revisión").
- Rutas nuevas en `App.tsx`:
  - `/supplier/signup` — formulario público (email, password, business_name, contact_name, phone). Crea usuario + fila en `suppliers` con `status='pending'` y `user_id`.
  - `/supplier` (layout con sidebar) → dashboard
  - `/supplier/products`, `/supplier/products/new`, `/supplier/products/:id/edit`
  - `/supplier/orders` (lista de items vendidos)
  - `/supplier/profile` (logo, descripción, slug, datos bancarios/fiscales)
  - `/proveedor/:slug` — escaparate público

## 3. Panel del proveedor (UI)

- `SupplierLayout` similar a `AdminLayout` con sidebar: Dashboard, Productos, Pedidos, Perfil.
- **Dashboard**: ventas del mes, comisión pagada, pedidos pendientes de envío, productos publicados.
- **Productos**: tabla CRUD reutilizando los componentes existentes de `AdminProducts` adaptados (sin selector de supplier — fijado a su propio id).
- **Pedidos**: tabla de `order_items` con info del cliente (nombre/dirección), botón "Marcar enviado" + campo tracking. Notificación email cuando entra un pedido nuevo (reusa infraestructura `enqueue_email`).
- **Perfil**: edita logo (upload a bucket `supplier-logos` público), descripción, slug, datos de pago, datos fiscales.

## 4. Admin

- Mejorar `/admin/suppliers`:
  - Columna `status` con acciones **Aprobar** / **Suspender** / **Rechazar**.
  - Aprobar = `status='approved'` + insertar `user_roles(role='supplier')` para el `user_id`.
  - Editar `commission_percent` por proveedor.
- `/admin/orders`: mostrar columna "proveedor" en items y resumen de comisión.

## 5. Vista pública

- **`/proveedor/:slug`** — hero con logo + descripción + grid de sus productos activos.
- **Badge "Vendido por X"** en `ProductCard` y `ProductDetail` (link a la página del proveedor).
- **Filtro "Vendido por"** en `Category` y `Search` (chips/Select con proveedores que tengan productos en el set).
- Añadir link al footer "¿Eres marca? Vende con nosotros" → `/supplier/signup`.

## 6. Checkout y emails

- En `Checkout`, al crear `order_items`, completar `supplier_id` desde `products.supplier_id`. El trigger calcula comisión.
- Email transaccional al proveedor cuando un pedido contiene sus productos (encolar tras crear el pedido). Reutiliza `enqueue_email` con un nuevo template `supplier_new_order`.

## 7. Storage

- Nuevo bucket público `supplier-logos`. RLS: lectura pública, escritura solo por el supplier dueño (o admin) — path `{supplier_id}/...`.

## Archivos a crear/tocar

- `supabase/migrations/...` — todo el bloque schema + RLS + bucket + seed Nutribatidos
- `src/context/AuthContext.tsx` — exponer `isSupplier`, `supplierId`, `supplierStatus`
- `src/components/SupplierRoute.tsx` (nuevo)
- `src/components/supplier/SupplierLayout.tsx` (nuevo)
- `src/pages/supplier/SupplierSignup.tsx`, `SupplierDashboard.tsx`, `SupplierProducts.tsx`, `SupplierProductForm.tsx`, `SupplierOrders.tsx`, `SupplierProfile.tsx`, `SupplierPending.tsx` (nuevos)
- `src/pages/SupplierStorefront.tsx` (nuevo, ruta `/proveedor/:slug`)
- `src/pages/admin/AdminSuppliers.tsx` — añadir acciones aprobar/suspender + comisión
- `src/pages/Category.tsx`, `src/pages/Search.tsx` — filtro "Vendido por"
- `src/components/ProductCard.tsx`, `src/pages/ProductDetail.tsx` — badge proveedor
- `src/pages/Checkout.tsx` — propagar `supplier_id` al insertar items
- `src/App.tsx` — registrar nuevas rutas
- `src/components/Footer.tsx` — link "Vende con nosotros"

## Lo que NO entra en este sprint (avísame si lo quieres después)

- Payouts automáticos vía Stripe Connect (la liquidación es manual: el admin ve `supplier_payout` por pedido).
- Chat cliente↔proveedor.
- Devoluciones gestionadas por el proveedor.
- Valoraciones/rating del proveedor.
