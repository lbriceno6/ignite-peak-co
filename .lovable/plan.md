
# Estructura SEO de categorías y objetivos — URLs cortas con jerarquía interna

## Resumen
Mantener `/categoria/[slug]` como única URL pública (flat), pero permitir jerarquía ilimitada interna usada SOLO para breadcrumbs, mega menú, filtros, sitemap y SEO interno. Añadir navegación por objetivo (`/objetivo/[slug]`) y centralizar la gestión en "Enlaces de sitio".

## 1. Base de datos (migración)

**Tabla `categories`** (ya existe) — añadir/asegurar columnas:
- `canonical_url` text, `long_description` text, `short_description` text (ya hay `description`)
- `show_in_home` bool, `show_in_sitemap` bool default true
- `related_category_ids` uuid[], `related_product_ids` uuid[], `related_goal_ids` uuid[]
- Validar slug único global (no por type) para soportar URL plana

**Nueva tabla `goals`** (objetivos de compra):
- id, name, slug (único), title_seo, meta_description, image_url, short_description, long_description, canonical_url, is_active, show_in_home, show_in_menu, show_in_mega_menu, sort_order, related_category_ids uuid[], related_product_ids uuid[]
- RLS: público lee activos; admin gestiona. GRANT correspondiente.

**Tabla `seo_redirects`** (ya existe) — sin cambios; se sigue usando para 301.

## 2. Resolución de URL plana con jerarquía interna

Dado que el slug es único globalmente:
- `/categoria/:slug` resuelve la categoría por slug en cualquier nivel
- Se calcula la cadena de padres (`parent_id` recursivo) para breadcrumbs
- Se añade helper `getCategoryAncestors(slug)` en `src/lib/categoryTree.ts`

Migrar la ruta anidada `/categoria/:catSlug/:subSlug` a redirect 301: si existe el slug hijo, redirigir a `/categoria/:subSlug`. Generar redirects automáticos para todas las rutas antiguas largas existentes (script de migración: por cada categoría con padre, insertar redirect `/categoria/{parentSlug}/{slug}` → `/categoria/{slug}`).

## 3. Frontend

**`src/pages/Category.tsx`**:
- Resolver siempre por `:slug` final
- Breadcrumb completo subiendo por `parent_id`
- JSON-LD `BreadcrumbList` con la jerarquía completa
- Canonical = `canonical_url` || `/categoria/{slug}`
- Mostrar subcategorías como tarjetas si existen hijos
- Banner, descripción corta, conteo de productos

**Nueva página `src/pages/Goal.tsx`** en `/objetivo/:slug`:
- Lee goal, muestra productos relacionados (unión de related_product_ids + productos de related_category_ids)
- SEO completo + BreadcrumbList: Inicio > Objetivos > {Goal}

**`Header.tsx` mega menú**: añadir sección "Compra por objetivo" leyendo `goals` activos `show_in_mega_menu`. Soportar 3 niveles desde `categories` (ya soporta padre/hijo; añadir tercer nivel renderizando nietos bajo hijos).

## 4. Admin

**`AdminCategories.tsx`**: extender formulario con todos los campos nuevos (canonical, long_description, show_in_home, show_in_sitemap, relacionados via multi-select). Mantener lógica actual de slug manual + alerta + redirect 301. Soportar selección de padre a cualquier nivel.

**Nuevo `AdminGoals.tsx` + ruta `/admin/objetivos`**: CRUD completo de goals con mismos campos SEO.

**"Enlaces de sitio" (`AdminSiteLinks.tsx`)** — añadir tres bloques:
1. `CategoriesLinksTable` (ya existe) — extender con columnas: Nivel, Canónica, Mostrar en menú/home, botón "Ver en tienda"
2. Nuevo `GoalsLinksTable` — mismas columnas para objetivos
3. Nuevo `RedirectsManager` — CRUD de `seo_redirects` (URL anterior, URL nueva, 301 fijo, fecha, activo, categoría asociada inferida)

## 5. Sitemap

Generación dinámica desde `categories` + `goals` activos `show_in_sitemap`. Actualizar `scripts/generate-sitemap.ts` para leer de Supabase y filtrar inactivos. Excluir URLs en `seo_redirects.from_path`.

## 6. Reglas de slug

Reutilizar `SLUG_RE` ya existente + validación de unicidad global (no por type). Mostrar error claro si existe.

## Detalles técnicos

```text
URL pública:        /categoria/colageno-bovino
Resolución:         categories.slug = 'colageno-bovino' (nivel 3)
Breadcrumb:         Inicio > Productos > Proteínas y Colágeno > Colágenos > Colágeno Bovino
                    (subiendo parent_id recursivamente)
Canonical:          https://domain/categoria/colageno-bovino
URL antigua:        /categoria/proteinas-y-colageno/colagenos/colageno-bovino
                    → 301 → /categoria/colageno-bovino (RedirectGate ya lo maneja)
```

Archivos a crear:
- `src/lib/categoryTree.ts` — helpers ancestros/descendientes
- `src/pages/Goal.tsx`
- `src/pages/admin/AdminGoals.tsx`
- `src/components/admin/GoalsLinksTable.tsx`
- `src/components/admin/RedirectsManager.tsx`
- Migración para `goals` + columnas nuevas en `categories` + backfill de redirects para rutas anidadas existentes

Archivos a editar:
- `src/App.tsx` (rutas `/objetivo/:slug`, `/admin/objetivos`)
- `src/pages/Category.tsx` (breadcrumb jerárquico, JSON-LD, canonical, subcategorías)
- `src/pages/admin/AdminCategories.tsx` (campos nuevos)
- `src/pages/admin/AdminSiteLinks.tsx` (montar GoalsLinksTable + RedirectsManager)
- `src/components/admin/CategoriesLinksTable.tsx` (columnas extra)
- `src/components/Header.tsx` (sección "Compra por objetivo", 3 niveles)
- `src/components/admin/AdminLayout.tsx` (link a Objetivos)
- `scripts/generate-sitemap.ts`

## Notas
- La URL plana exige slug único global → la migración debe detectar y reportar duplicados antes de aplicar el índice único; si hay conflictos, los reportamos al admin sin romper datos.
- No se elimina la ruta anidada: queda como compatibilidad redirigida.
- Lucia chat / búsqueda inteligente / Header realtime ya implementados no se tocan.

¿Apruebas este plan para implementarlo?
