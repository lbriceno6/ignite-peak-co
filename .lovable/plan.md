# Sistema Global de Filtros del Catálogo

Unificar todos los filtros del ecommerce bajo un único módulo admin "Filtros del Catálogo". Todas las páginas de listado de productos consumirán la misma configuración.

## 1. Base de datos (migración)

**Tabla `catalog_filters`** (definición de cada filtro):
- `id`, `name`, `slug` (único), `filter_type` (enum: category, subcategory, brand, price, ingredient, benefit, need, goal, tag, stock, promotion, flag, combo, featured, new)
- `is_active` (bool), `display_order` (int)
- `selection_type` (`single` | `multi`)
- `show_desktop`, `show_mobile`, `default_open` (bool)
- `pages_visibility` (jsonb array: `["catalog","category","subcategory","brand","search","need","promotions","combos","featured","new","related"]`)
- `ui_widget` (`checkbox` | `range` | `chips` | `toggle`) — derivado del tipo
- timestamps

**Tabla `catalog_filter_options`** (opciones de cada filtro):
- `id`, `filter_id` (FK), `name`, `slug`, `value` (text), `image_url`, `color`
- `display_order`, `is_active`
- timestamps
- Unique (`filter_id`, `slug`)

**Tabla `product_filter_values`** (relación producto ↔ opción):
- `id`, `product_id` (FK), `filter_id` (FK), `option_id` (FK nullable, para tipos abiertos como precio), `value` (text, opcional para valores numéricos)
- Unique (`product_id`, `filter_id`, `option_id`)
- Índices por `product_id` y por (`filter_id`, `option_id`)

GRANTs: lectura `anon`/`authenticated` (sólo activos vía RLS), escritura admin, ALL `service_role`.

Seed inicial: migrar los filtros existentes (precio, categoría, subcategoría, necesidad, presentación, sabor, marca, disponibilidad, valoración) desde la configuración actual `catalog_filter_settings` y `filter_options` a las nuevas tablas, conservando orden y estado.

## 2. Admin · `/admin/filters` (reemplaza/expande módulo actual)

**Listado** (`AdminCatalogFilters.tsx` rewrite):
- Tabla con todos los filtros: nombre, tipo, opciones (count), páginas donde aparece (chips), estado, orden, acciones.
- Drag-handle o flechas para ordenar.
- Botones: Nuevo filtro, Restaurar recomendados.

**Form crear/editar** (`AdminCatalogFilterForm.tsx`):
- Nombre, slug (auto), tipo, selección única/múltiple
- Switches: activo, desktop, móvil, abierto por defecto
- Multi-select de páginas (catálogo, categoría, subcategoría, marca, búsqueda, necesidad, promociones, combos, destacados, nuevos, relacionados)
- Editor de opciones inline (nombre, slug, valor, color, imagen opcional, orden, activo) con add/remove/reorder
- Para tipos `price`/`stock`/`featured`/`new`/`promotion` las opciones se infieren — no se editan manualmente

**Eliminar** con confirmación; borra cascada de opciones y values.

## 3. Hook único de consumo

`useCatalogFilters(page: PageKey)`:
- Carga filtros activos donde `pages_visibility` incluye `page`
- Devuelve filtros ordenados con sus opciones activas
- Cachea con react-query patrón existente

`useFilteredProducts({ page, baseQuery, selected })`:
- Recibe filtros seleccionados desde URL
- Construye query Supabase con joins a `product_filter_values`
- Devuelve productos + contadores por opción (facets)

## 4. Componente UI compartido

`<CatalogFiltersPanel page="..." />`:
- Renderiza todos los filtros configurados según tipo
- Sidebar desktop / Sheet móvil (un solo componente, `useIsMobile`)
- Lee/escribe estado en URL (`?marca=...&necesidad=...&precio=30-80`)
- Botón "Limpiar filtros", contador de productos, contador por opción
- Empty state con "No encontramos productos" + limpiar

`<CatalogPageLayout>`: layout grid filtros izquierda + productos derecha + grid 4 col.

## 5. Integración en páginas

Reemplazar la lógica de filtros local en:
- `src/pages/Category.tsx` (page="category")
- `src/pages/CategoryTaxonomy.tsx` (page="subcategory")
- `src/pages/BrandPage.tsx` (page="brand")
- `src/pages/Search.tsx` (page="search")
- `src/pages/Goal.tsx` (page="need")
- `src/pages/SeoLanding.tsx` o `/promociones` (page="promotions")
- Página combos (page="combos")
- Sección destacados/nuevos si tienen ruta propia

Todas las páginas: mismo `<CatalogFiltersPanel>` + mismo grid. La página sólo añade su filtro base (categoría=X, marca=Y, query=q) y delega el resto.

## 6. Form de producto

En `ProductForm.tsx` y `SupplierProductForm.tsx`: sección "Atributos filtrables" que muestra los filtros con tipo entity (marca, categoría, ingredientes, beneficios, necesidades, etiquetas) y permite asignar opciones al producto → escribe en `product_filter_values`. Campos directos del producto (precio, stock, is_featured, is_new) ya existen y no se duplican.

## 7. Reglas

- Filtros con `is_active=false` ocultos en toda la tienda; admin los ve.
- Página que no esté en `pages_visibility` no muestra ese filtro.
- Si un producto no tiene un valor de filtro, simplemente no aparece bajo esa opción (no se rompe).
- URL es la fuente de verdad del estado de filtros.

## Archivos a crear/editar

**Nuevos:**
- `supabase/migrations/<ts>_catalog_filters_unified.sql`
- `src/hooks/useCatalogFilters.ts`
- `src/hooks/useFilteredProducts.ts`
- `src/components/catalog/CatalogFiltersPanel.tsx`
- `src/components/catalog/CatalogPageLayout.tsx`
- `src/pages/admin/AdminCatalogFilterForm.tsx`

**Editar:**
- `src/pages/admin/AdminCatalogFilters.tsx` (rewrite a listado CRUD)
- `src/pages/admin/AdminFilterOptions.tsx` (deprecar/redirigir al nuevo)
- `src/App.tsx` (rutas admin nuevas)
- `src/components/admin/AdminLayout.tsx` (renombrar item)
- Páginas de listado: `Category.tsx`, `CategoryTaxonomy.tsx`, `BrandPage.tsx`, `Search.tsx`, `Goal.tsx`, combos, promociones
- `ProductForm.tsx`, `SupplierProductForm.tsx` (atributos filtrables)

## Notas técnicas

- Diseño actual se conserva: mismo grid 4 columnas, mismo sidebar de filtros, mismos componentes shadcn (Accordion, Checkbox, Slider, Sheet).
- Migración no rompe datos: mantiene `products.brand`, `products.category`, etc. — sólo añade capa de mapeo.
- Trabajo grande: ~10 archivos nuevos + ~8 ediciones. Se hará en una sola pasada tras tu aprobación.

¿Apruebas que avancemos con esta implementación?
