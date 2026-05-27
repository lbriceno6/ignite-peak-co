## Promociones tipo "Segundo producto"

Voy a crear un sistema completo de promociones tipo BOGO (Buy One Get One) con dos modalidades: segundo con descuento (%) o segundo gratis (2x1).

### 1. Base de datos (migración)

Nueva tabla `promotions`:
- `id`, `name` (nombre interno)
- `benefit_type`: enum `'second_discount' | 'second_free'`
- `discount_percent` (numérico, solo aplica si `second_discount`; valores libres: 25/30/40/50/70/personalizado)
- `start_date`, `end_date` (timestamptz, nullables)
- `usage_limit_per_order` (int, default 1)
- `show_on_home` (bool), `show_on_product` (bool)
- `is_active` (bool)

Nueva tabla `promotion_products`:
- `promotion_id` → `promotions.id`
- `product_id` → `products.id`
- PK compuesta

GRANTs + RLS:
- Lectura pública de promociones activas vigentes
- Admins gestionan todo (insert/update/delete)

### 2. Admin: nueva página `AdminPromotions.tsx`

Ruta `/admin/promociones`. Lista + formulario con:
- Nombre
- Tipo de beneficio (radio: descuento / gratis)
- Porcentaje (select 25/30/40/50/70 + "Personalizado" con input) — solo visible si tipo = descuento
- Multi-select de productos participantes (buscable)
- Fechas inicio/fin
- Límite por pedido
- Toggles: Mostrar en Home, Mostrar en ficha, Activo

Se añade entrada en el sidebar admin bajo "Catálogo".

### 3. Lógica de aplicación en carrito

Nuevo helper `src/lib/promotions.ts`:
- `expandUnits(items)`: convierte CartItems en una lista plana de unidades con su precio
- `applyPromotions(items, promotions)`: para cada promoción activa, agrupa unidades participantes en pares y aplica descuento al de **menor precio** del par
- Retorna `{ discountTotal, appliedPromotions: [{promotionId, name, label, amount}] }`

Hook `usePromotions()` que carga promociones vigentes activas con sus product_ids desde Supabase y cachea.

Integración en:
- `src/store/cart.ts` → `cartTotals` recibe descuento de promos (o se calcula en consumidor)
- `src/pages/Cart.tsx` → muestra línea "Promoción: X" con texto dinámico
- `src/components/CartDrawer.tsx` → idem
- `src/pages/Checkout.tsx` → aplica el mismo descuento al total y lo persiste en la orden como descuento adicional (en `subtotal` calculado o nuevo campo opcional). Para no tocar esquema de orders, se descuenta del subtotal antes de guardar.

### 4. Etiquetas en producto

En `ProductCard.tsx` y ficha de producto: si el producto está en alguna promoción activa con `show_on_product = true`, mostrar badge:
- `2do con X% dscto` (segundo con descuento)
- `2x1` (segundo gratis)

### 5. Banner en Home (opcional, mínimo)

Si hay promo con `show_on_home = true`, mostrar pequeño banner sobre el carrusel con título + subtítulo dinámicos según tipo.

### Textos dinámicos (helper)
```
labelForPromo(p): "2do con 50% dscto" | "2x1"
titleForPromo(p): "Compra uno y lleva otro [gratis]"
cartMessage(p): "Promoción aplicada: ..."
```

### Archivos a crear
- `supabase/migrations/<ts>_promotions.sql`
- `src/lib/promotions.ts`
- `src/hooks/usePromotions.ts`
- `src/pages/admin/AdminPromotions.tsx`
- `src/components/PromoBadge.tsx`

### Archivos a editar
- `src/App.tsx` — ruta admin
- `src/components/admin/AdminLayout.tsx` — link sidebar
- `src/components/ProductCard.tsx` — badge
- `src/pages/ProductDetail.tsx` — badge + mensaje
- `src/store/cart.ts` — exponer subtotal pre-descuento (ya existe)
- `src/pages/Cart.tsx` — mostrar descuento promo
- `src/components/CartDrawer.tsx` — mostrar descuento promo
- `src/pages/Checkout.tsx` — aplicar descuento promo al total
- `src/pages/Index.tsx` — banner home (si aplica)

### No se toca
- Lógica de productos / IA / editor imágenes
- Estructura de `orders` (el descuento se refleja en `subtotal` calculado en checkout, igual que el reseller_discount)
- Identidad visual

¿Apruebas para implementar?
