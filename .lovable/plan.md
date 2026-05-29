# Plan: Buscador avanzado Nutribatidos

Voy a construir un buscador en vivo con panel desplegable de 2 columnas, búsqueda por necesidad/categoría/etiquetas/ingredientes, y configuración admin.

## 1. Base de datos (migración)

Nueva tabla `search_settings` (singleton id=1):
- `live_suggestions_enabled` bool
- `max_products` int (default 4)
- `manual_suggestions` text[] (default omega 3, vitaminas, bienestar, omegas, colágeno, energía, digestión)
- `ai_enabled` bool, `ai_provider` text, `ai_model` text, `ai_prompt` text

Nueva tabla `search_keyword_map`:
- `keyword` text, `product_ids` uuid[], `category_slug` text, `need_slug` text

Reutilizar `search_needs` existente (ya hay keywords → categoría/productos). Sembrar con: energia, digestion, colageno, fitness, sin-azucar.

GRANTs para anon (lectura pública), authenticated, service_role. Admin write vía `has_role`.

## 2. Componente `LiveSearchBar` (reemplaza el input del Header)

- Lupa a la **derecha**, placeholder "Buscar por necesidad: cansancio, digestión, colágeno..."
- Debounce 200ms, activa con ≥2 chars
- Panel flotante absoluto debajo del input (full width desktop, modal-like en móvil)
- Click fuera / ESC / botón X cierra
- Enter → `/buscar?q=...`

### Lógica de búsqueda (client-side sobre query a Supabase)
1. Match exacto en `search_needs.keywords` → expande a `related_products` + sinónimos.
2. Query a `products` con `or(name.ilike, category.ilike, brand.ilike, short_description.ilike, tags.cs)` filtrado por `is_active` y `approval_status='approved'`.
3. Ordenar: stock>0 primero, luego rating.
4. Si 0 resultados → mensaje + botón WhatsApp.

### Panel (desktop 2 columnas, móvil 1 columna apilada)
- **Izquierda "SUGERENCIAS"**: chips desde `search_settings.manual_suggestions` + necesidades coincidentes con la query. Click → ejecuta búsqueda con ese término.
- **Derecha "PRODUCTOS PARA {QUERY}"**: hasta N tarjetas con imagen, marca, nombre, precio, badge stock, botón "Añadir al carrito" (verde si stock, gris "No disponible" si no), corazón favorito.
- Footer: "Ver todos los X productos" → `/buscar?q=...`

## 3. Integración carrito
- Usar `useCart` (store/cart.ts) existente; `addItem` + toast "Producto agregado al carrito".

## 4. Admin: `/admin/search-config` (nueva página)

Tabs/secciones:
- **General**: switches live suggestions, slider max productos
- **Sugerencias manuales**: editor de lista (chips)
- **Mapa de palabras → productos**: tabla CRUD sobre `search_keyword_map`
- **Necesidades → categorías**: enlace a editor de `search_needs` (ya existe en `AdminSearchAi`)
- **IA**: switch on/off, select proveedor (Gemini/OpenAI/DeepSeek/Claude/Off), input modelo, textarea prompt, botón guardar API key (usa `add_secret`)

Agregar entrada al sidebar admin.

## 5. Header
Reemplazar el input actual por `<LiveSearchBar />`. Mantener ruta `/buscar` actual intacta.

## Archivos

**Nuevos:**
- `supabase/migrations/<ts>_search_settings.sql`
- `src/components/search/LiveSearchBar.tsx`
- `src/components/search/SearchResultsPanel.tsx`
- `src/hooks/useSearchSettings.ts`
- `src/lib/liveSearch.ts` (función de búsqueda combinada)
- `src/pages/admin/AdminSearchConfig.tsx`

**Editados:**
- `src/components/Header.tsx` (usar nuevo componente)
- `src/App.tsx` (ruta admin)
- `src/components/admin/AdminLayout.tsx` (link sidebar)

## Detalles técnicos

- Búsqueda combinada en `liveSearch.ts`: 1 query a `search_needs` (cacheada) + 1 query a `products` con `.or()` ilike multi-campo + `.eq('is_active',true).eq('approval_status','approved').order('stock',{ascending:false}).limit(maxProducts*2)`. Dedupe por id.
- Sugerencias dinámicas: manual_suggestions filtradas por `includes(query)` + necesidades cuyos keywords matchean.
- Móvil: panel ocupa viewport (fixed top), con backdrop. Desktop: absolute bajo el input.
- No tocar `intelligent-search` edge function existente; el live search es client-only para latencia baja. La IA del admin se usará en futuro/Search.tsx.

¿Apruebas para implementar?