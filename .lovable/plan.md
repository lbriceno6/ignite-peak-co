## Módulo de Marcas (Brands) para Nutribatidos

### 1. Base de datos (migración)

**Tabla `brands`** (nueva):
- `id`, `name`, `slug` (único), `logo_url`, `banner_url`
- `short_description`, `long_description`
- `is_active` (bool), `display_order` (int)
- `seo_title`, `seo_description`
- `created_at`, `updated_at` (con trigger)

GRANT: `anon` y `authenticated` SELECT (solo activas vía RLS), admin write, `service_role` ALL.

**Tabla `products`**: agregar `brand_id uuid` con FK `ON DELETE SET NULL` → `brands.id`. Mantener columna `brand` (texto) existente para no romper nada; el nuevo flujo usa `brand_id` y, opcionalmente, sincroniza `brand` con el nombre.

**Storage**: bucket público `brand-assets` para logos/banners, con políticas (lectura pública, escritura admin).

### 2. Admin · `/admin/brands`

Nueva entrada en `AdminLayout` ("Marcas", icon `Award`). Páginas:

- **Listado** (`AdminBrands.tsx`): tabla con logo, nombre, slug, descripción, estado, **cantidad de productos asociados** (count via `products.brand_id`), botones Editar/Eliminar.
- **Form crear/editar** (`AdminBrandForm.tsx`): todos los campos del brief; slug auto-generado desde el nombre, editable; subida de logo y banner al bucket `brand-assets`; switch estado; SEO; orden.
- **Eliminar**: dialog confirmación. Si la marca tiene productos, ofrecer 3 opciones: reasignar a otra marca (select), quitar marca (set NULL), cancelar.

### 3. Integración con productos

En `ProductForm.tsx` y `SupplierProductForm.tsx`:
- Nuevo campo "Marca" (Select con búsqueda usando `Command`), cargado desde `brands` activas.
- Botón "Crear nueva marca" → dialog inline para crear sin salir del form.
- Al guardar, persistir `brand_id` y opcionalmente espejar `brand` (texto) con el nombre.

### 4. Página pública `/marca/:slug`

Nuevo `BrandPage.tsx` (ruta agregada en `App.tsx`):
- Header con logo, banner, nombre, descripción.
- SEO con `<SEO />` usando `seo_title`/`seo_description`.
- Grid de productos de la marca, con filtros básicos (categoría, precio, disponibilidad) — reutilizar `ProductCard`.

### 5. Buscador

En `liveSearch.ts`:
- Añadir consulta paralela a `brands` por `name`/`slug` ILIKE.
- Devolver `brands[]` en el resultado.
- También buscar productos por `brand_id` cuando una marca coincide.

En `LiveSearchBar.tsx`: nueva sección "MARCAS" en el dropdown con logo pequeño + nombre, link a `/marca/:slug`.

### 6. Tarjeta de producto

En `ProductCard.tsx` (y card del buscador): mostrar el nombre de la marca encima del nombre del producto, en texto pequeño/muted. Solo si existe marca activa; nunca mostrar "Sin marca" en la tienda pública.

### 7. Reglas

- Slug único enforced por DB unique constraint.
- Placeholder `/placeholder.svg` cuando no haya logo.
- Solo marcas con `is_active=true` visibles en tienda pública (RLS).
- Admin ve todas (RLS con `has_role(...,'admin')`).
- Productos sin marca: en admin se muestra "Sin marca"; en público se omite.

### Archivos a crear/editar

**Nuevos:**
- `supabase/migrations/<ts>_brands.sql`
- `src/pages/admin/AdminBrands.tsx`
- `src/pages/admin/AdminBrandForm.tsx`
- `src/pages/BrandPage.tsx`
- `src/hooks/useBrands.ts`
- `src/components/admin/BrandSelect.tsx` (selector + quick create)

**Editar:**
- `src/components/admin/AdminLayout.tsx` (nuevo item)
- `src/App.tsx` (rutas `/admin/brands`, `/admin/brands/new`, `/admin/brands/:id/edit`, `/marca/:slug`)
- `src/pages/admin/ProductForm.tsx` y `src/pages/supplier/SupplierProductForm.tsx` (campo marca)
- `src/lib/liveSearch.ts` y `src/components/search/LiveSearchBar.tsx` (búsqueda + UI de marcas)
- `src/components/ProductCard.tsx` (mostrar marca encima del nombre)
- `src/integrations/supabase/types.ts` se regenera automáticamente tras la migración.

¿Apruebas que avancemos con esta implementación?