# Importador Web Inteligente

Nuevo módulo admin en `/admin/importador-web` para extraer productos de URLs externas, revisarlos y publicarlos como borradores en Nutribatidos. **Nunca publica automáticamente.**

## 1. Base de datos (migración)

**Tabla `imported_products`**
- `id`, `job_id` (fk), `source_url`, `source_domain`
- Datos originales: `original_title`, `original_description`, `original_price`, `original_sale_price`, `original_currency`, `original_image_url`, `original_gallery_urls` (jsonb)
- Detectado: `detected_brand`, `detected_category`, `detected_stock`, `imported_data` (jsonb crudo)
- IA: `ai_rewritten_title`, `ai_rewritten_description`, `ai_long_description`, `ai_benefits`, `ai_meta_title`, `ai_meta_description`, `ai_keywords` (jsonb), `ai_category_suggestion`, `ai_intent_suggestion`, `ai_ingredients` (jsonb)
- `stored_image_url` (cuando se sube a Storage)
- `status` enum: pending, reviewed, imported, discarded, error
- `created_product_id` (fk products), `created_by`, `created_at`, `updated_at`

**Tabla `web_import_jobs`**
- `id`, `source_url`, `source_domain`, `mode` (auto/category/product)
- `products_found`, `products_imported`, `status` (running/done/error), `error_message`
- `created_by`, timestamps

RLS: solo admins (`has_role(auth.uid(),'admin')`). GRANTs para `authenticated` y `service_role`.

## 2. Edge Function `web-product-importer`

`supabase/functions/web-product-importer/index.ts`

Recibe `{ url, mode }`. Validaciones:
- URL http/https
- Bloquear localhost, IPs privadas (10/8, 172.16/12, 192.168/16, 127/8, ::1, fc00::/7)
- Solo HTML (validar content-type)
- Timeout 15s con `AbortController`
- Máx 3 MB de body
- Máx 30 productos

Extracción en orden:
1. JSON-LD `@type: Product` (parseo de `<script type=application/ld+json>`)
2. OpenGraph / meta tags (`og:title`, `og:image`, `product:price:amount`)
3. Microdata `itemtype=schema.org/Product`
4. Selectores comunes: `.product-card`, `.product-item`, `[class*=product]`, `.price`, `img`
5. Fallback IA con Gemini (`google/gemini-3-flash-preview`) si LOVABLE_API_KEY presente — recibe HTML truncado y devuelve JSON

Devuelve `{ job_id, products: [...], errors: [] }`. Inserta en tablas con auth del admin.

## 3. Edge Function `web-product-rewrite`

Recibe `imported_product_id`. Llama Lovable AI Gateway con prompt comercial Nutribatidos (tono natural, sin diagnósticos médicos, sin inventar ingredientes/certificaciones, no copiar literal). Devuelve y guarda en columnas `ai_*`.

## 4. Edge Function `web-product-save-image`

Recibe `imported_product_id`. Descarga `original_image_url`, valida MIME (jpg/png/webp) y tamaño (<5MB), sube a bucket `imported-images` (crear público), guarda en `stored_image_url`.

## 5. UI Admin `/admin/importador-web`

`src/pages/admin/AdminWebImporter.tsx`:
- Aviso de uso responsable (no ocultable)
- Form: input URL + select modo + botón "Analizar web"
- Tabs: **Resultados actuales** | **Historial**
- Tabla de productos extraídos con checkbox, imagen, nombre, precio, marca, categoría detectada, URL, estado
- Acciones por fila: Ver detalle (drawer), Reescribir con IA, Guardar imagen, Descartar
- Acciones bulk: Importar seleccionados como borrador, Descartar
- Historial: tabla `web_import_jobs` con filtros dominio/estado, botón reanalizar/eliminar

Drawer detalle: edición inline de todos los campos antes de importar, sugerencias IA visibles, selector de categoría e intención (autocompletados desde `categories` y `purchase_intents`).

## 6. Importación al catálogo

Botón "Importar como borrador" → insert en `products`:
- `name` = `ai_rewritten_title || original_title`
- `short_description`, `description`, `price`, `sale_price`
- `main_image` = `stored_image_url || original_image_url`
- `is_active = false`, `approval_status = 'pending'`
- `slug` autogenerado, chequear duplicados por slug/URL/nombre similar → warning

Actualiza `imported_products.status = 'imported'` y `created_product_id`.

## 7. Registro de ruta y menú

- Añadir ruta en `src/App.tsx` bajo `/admin`
- Añadir item en `AdminLayout` sidebar: "Importador Web Inteligente" → `/admin/importador-web`

## 8. Sugerencias de intención (cliente)

Mapeo simple en frontend al detectar palabras clave en título/descripción:
- colágeno → `colagenos` / intención `colageno`
- maca → `energia`
- omega 3 → `bienestar`
- proteína → `fitness`

Se aplica como default editable.

## Notas técnicas
- Storage: crear bucket `imported-images` público con RLS write admin-only.
- No tocar productos existentes ni publicarlos automáticamente.
- Toda función edge usa `verify_jwt` default + `getClaims` + `has_role` check.
- Sin nuevas dependencias npm (parseo HTML con regex + DOMParser via `deno-dom` npm import si necesario).

## Entregables
1 migración SQL, 3 edge functions, 1 página admin nueva, 1 bucket, ajustes a `App.tsx` y `AdminLayout`.
