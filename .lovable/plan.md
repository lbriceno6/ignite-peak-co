# Combos Inteligentes — Plan de implementación

Objetivo: subir el ticket promedio con combos manuales + reglas + IA opcional, integrados al carrito actual sin romper nada. Todo administrable desde un nuevo módulo.

## Alcance

Incluye:
- Base de datos para combos, sus productos, reglas, configuración global y métricas.
- Panel admin "Combos Inteligentes" (CRUD + reglas + config IA + métricas).
- Widgets en frontend: página de producto, carrito (drawer), checkout, home, búsqueda, categorías.
- Función `smartComboRecommendation()` que decide qué combos mostrar.
- Edge function `combo-ai-recommend` que llama Lovable AI / DeepSeek si la IA está activa, con fallback a reglas manuales.
- Tracking de eventos: vista, add-to-cart, comprado.

Fuera de alcance (lo dejamos para iteración 2 si lo pides):
- Test A/B con grupos.
- Reportes exportables CSV (solo verás métricas en la UI).
- Combos por proveedor / multi-marca con reparto de comisión (heredamos commission de cada producto como hoy).

## Base de datos

```text
combos
 ├─ id, name, slug, description, image_url
 ├─ price_normal (calculado server-side al guardar)
 ├─ price_combo
 ├─ discount_value, discount_type ('amount'|'percent')
 ├─ is_active, starts_at, ends_at
 ├─ priority ('high'|'medium'|'low')
 ├─ need_tag (energía, fitness, digestión, colágeno, sin azúcar, bienestar, promo)
 ├─ category_id (opcional → categories.id)
 ├─ display_locations text[]  (product, cart, checkout, search, home, category)
 └─ stats: views, cart_adds, purchases, revenue (denormalizado, actualizado por triggers/edge fn)

combo_products
 └─ id, combo_id, product_id, quantity

combo_rules
 ├─ id, combo_id
 ├─ rule_type ('view_product'|'cart_has_product'|'cart_min_total'|'free_shipping_gap'|'need_search'|'cart_has_category')
 ├─ product_id, category_id, need_tag
 ├─ min_cart_total, max_cart_total
 ├─ priority, is_active

combo_config (singleton)
 ├─ ai_enabled, ai_provider ('gemini'|'openai'|'deepseek'|'claude'|null)
 ├─ ai_prompt (texto editable, viene con default)
 ├─ max_recommendations (default 3)
 ├─ show_in_product, show_in_cart, show_in_checkout, show_in_search, show_in_home, show_in_category
 └─ updated_at

combo_events
 └─ id, combo_id, event_type ('view'|'cart_add'|'purchase'), order_id, user_id, source_location, created_at
```

RLS: lectura pública de `combos`, `combo_products`, `combo_rules`, `combo_config` (solo activos para anon). Escritura solo admin. `combo_events` insert por todos (incluyendo anon para `view`), select solo admin. GRANTs explícitos.

Las API keys de IA (`api_key` del brief) NO van en DB pública. Usamos las secrets ya existentes: `LOVABLE_API_KEY` (Lovable AI: gemini/openai/claude) y `DEEPSEEK_API_KEY`. En `combo_config` solo guardamos qué proveedor usar.

## Lógica de recomendación

`src/lib/smartCombos.ts` exporta:

```ts
smartComboRecommendation({
  productSlug?, cart, needTag?, location, freeShippingThreshold
}) → ComboRecommendation[]
```

Flujo:
1. Carga `combo_config` + combos activos vigentes (`starts_at/ends_at`) + reglas + productos.
2. Filtra por `display_locations` que incluya `location`.
3. Evalúa reglas por `rule_type` y arma score (prioridad + match cantidad de reglas).
4. Excluye combos cuyos productos no tengan stock o ya estén completos en el carrito.
5. Excluye duplicados; máx `max_recommendations` (default 3).
6. Si `ai_enabled`: llama edge function `combo-ai-recommend` que recibe contexto + lista de combos candidatos y devuelve subset reordenado con `reason` y `message` (la IA NO inventa combos, solo elige y redacta copy). Si falla → fallback a la lista local.

Reglas especiales:
- `free_shipping_gap`: si `cart_total < threshold`, recomienda combos/productos del rango [gap, gap+30%].
- `convert_to_combo`: detecta si carrito ya contiene `>=` 1 producto de un combo y aún le faltan otros → CTA "Convertir mi carrito en combo".

## Edge function

`supabase/functions/combo-ai-recommend/index.ts`:
- Recibe `{ candidates, context }`.
- Según `combo_config.ai_provider` arma payload:
  - gemini/openai/claude → Lovable AI Gateway (`google/gemini-3-flash-preview` por defecto).
  - deepseek → API DeepSeek con `DEEPSEEK_API_KEY`.
- Devuelve `{ recommendations: [{ combo_id, reason, message }] }`.
- Manejo de 429/402 con mensaje claro.

## Frontend

Nuevos:
- `src/components/combos/ComboCard.tsx` — tarjeta combo (imagen, productos, precio tachado, ahorro, botón).
- `src/components/combos/ComboRecommendations.tsx` — wrapper con título/mensaje, llama `smartComboRecommendation` y renderiza N tarjetas.
- `src/components/combos/ConvertToComboBanner.tsx` — banner "Convierte tu carrito en combo".
- `src/hooks/useComboRecommendations.ts` — fetch + cache + invalidación cuando cambia el carrito.

Integraciones (sin romper nada):
- `src/pages/ProductDetail.tsx` → debajo de "Agregar al carrito" muestra `<ComboRecommendations location="product" productSlug={p.slug} />`.
- `src/components/CartDrawer.tsx` → bloque "Recomendado para completar tu pedido" + mensaje dinámico envío gratis (reusa `useFreeShippingBar`).
- `src/pages/Checkout.tsx` → bloque previo al botón "Pagar", solo 1 recomendación.
- `src/pages/Index.tsx` → bloque opcional "Combos destacados" si `show_in_home`.
- `src/pages/Search.tsx` → recomendación si la búsqueda mapea a un `need_tag`.
- `src/pages/Category.tsx` → recomendación filtrada por `category_id`.

Carrito: nueva acción `addComboToCart(comboId)` en `src/store/cart.ts`:
- Valida stock de todos los productos.
- Agrega cada producto del combo.
- Marca los ítems con `combo_id` y aplica precio prorrateado para que el subtotal cuadre con `price_combo`.
- Si algún producto no tiene stock → toast y NO agrega nada.

## Admin

Ruta `/admin/combos` (nuevo ítem en `AdminLayout.tsx`):

- Tabla de combos con filtros (estado, necesidad, vigencia).
- Form crear/editar combo:
  - Datos básicos, imagen (storage bucket nuevo `combo-images`).
  - Selector de productos con cantidad.
  - Precio normal autocalculado, input de precio combo o descuento (%/S/).
  - Vigencia, prioridad, necesidad, categoría, ubicaciones (checkboxes).
- Sub-tab "Reglas": CRUD de `combo_rules` con tipo + parámetros condicionales.
- Sub-tab "Configuración IA": toggle, proveedor, prompt editable, max recomendaciones, ubicaciones globales.
- Sub-tab "Métricas": vistas, adds, compras, ingresos, ticket promedio antes/después (vista materializada simple sobre `combo_events` + `orders`).

Archivos:
- `src/pages/admin/AdminCombos.tsx`
- `src/components/admin/combos/ComboForm.tsx`
- `src/components/admin/combos/ComboRulesEditor.tsx`
- `src/components/admin/combos/ComboConfigPanel.tsx`
- `src/components/admin/combos/ComboMetricsPanel.tsx`

## Tracking

- `combo_events` se inserta cuando:
  - `view`: el widget se monta y el combo entra a viewport.
  - `cart_add`: se llama `addComboToCart`.
  - `purchase`: al pasar el pedido a estado `confirmed` (trigger en `orders` o lectura desde admin).
- Métricas se calculan con `read_query` en el panel admin (sin tablas extra).

## Compliance / copy

- En `ComboCard` y mensajes IA: forzar disclaimer "complemento nutricional". El prompt base ya lo incluye y validamos por reglas en frontend (lista negra: "cura", "trata", "enfermedad").

## Pasos de entrega

1. Migración SQL (tablas + RLS + GRANTs + storage bucket `combo-images`).
2. Seed mínimo: 1 combo demo, 1 regla `view_product`, `combo_config` con defaults.
3. `smartCombos.ts` + hook + componentes UI.
4. Integración en ProductDetail, CartDrawer, Checkout, Home, Search, Category.
5. `addComboToCart` en el store.
6. Edge function `combo-ai-recommend`.
7. Admin (`AdminCombos` + tabs).
8. Tracking + panel de métricas.
9. Smoke test manual + sitemap (no aplica), verificar build.

## Confirmaciones que necesito

1. ¿La API key de proveedores la dejamos en secrets (`DEEPSEEK_API_KEY` ya existe, los otros vía `LOVABLE_API_KEY`) o quieres un campo en admin para cada proveedor? **Recomiendo secrets** por seguridad.
2. Para el precio del combo dentro del carrito, ¿prefieres (a) prorratear el descuento entre los ítems del combo o (b) agregar los productos a precio normal y aplicar una línea de descuento "Combo X — Ahorro S/16"? **Recomiendo (b)**, más transparente.
3. ¿OK con que las métricas se vean en admin pero sin export CSV en esta iteración?
4. ¿El tracking de `view` puede correr como anon insert en `combo_events`? Sin eso solo medimos usuarios logueados.
