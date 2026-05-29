
## Resultado esperado

Un mega menú profesional, escalable y editable desde el admin:
- Limpio como Organa: columnas con listado simple y enlace "Ver todo".
- Escalable como iHerb: navegación por producto y por objetivo, hasta 3 niveles.
- URLs cortas: `/categoria/[slug]`, `/objetivo/[slug]`.
- Mobile en acordeón.
- Mantiene SEO (enlaces reales, slug independiente del nombre visible, respeta redirecciones, oculta inactivos).

## Arquitectura

Hoy el menú se arma a partir de `categories.menu_column / menu_group_title / parent_id` + `menu_custom_fields`. Es funcional pero acoplado: cada cambio editorial implica tocar categorías.

Voy a introducir un **constructor de mega menú** independiente, sin romper lo existente:

```text
mega_menu_columns           (una columna por entrada de menú principal)
 ├─ parent_nav: "products" | "goals" | <slug nav_links>   ← a qué item top se asocia
 ├─ title (editable)         ← p.ej. "Superfoods Andinos"
 ├─ position (orden)
 ├─ see_all_label, see_all_href  ← "Ver todo" editable
 ├─ show_desktop / show_mobile
 └─ is_active

mega_menu_items             (items dentro de cada columna)
 ├─ column_id → mega_menu_columns
 ├─ display_label            ← nombre visible; NO toca slug
 ├─ link_type: "category" | "goal" | "page" | "url"
 ├─ category_id / goal_id / url
 ├─ icon, image_url (opcional)
 ├─ open_in_new_tab
 ├─ position
 ├─ show_desktop / show_mobile
 ├─ is_active
 └─ seo_note (texto interno)
```

Resolución de URL en el frontend:
- `category` → busca slug actual en `categories` (si cambia, link se actualiza solo).
- `goal` → `/objetivo/{slug}` de `goals`.
- `page` → ruta interna fija.
- `url` → URL personalizada.
- Antes de renderizar, se filtran categorías/objetivos inactivos y se aplica `seo_redirects` activas para apuntar siempre a la URL canónica.

## Base de datos (migración)

1. Crear `mega_menu_columns` y `mega_menu_items` con GRANTs + RLS:
   - SELECT público para activos.
   - ALL para admins.
2. Triggers `set_updated_at`.
3. Backfill desde lo que ya hay: convertir cada `parent_id` raíz con subs en una columna; convertir cada sub en item tipo `category`. Items extra desde `menu_custom_fields` mantienen su tipo.
4. Seed inicial alineado con el ejemplo del brief (Productos, Compra por objetivo, Superfoods Andinos, Proteínas y Colágeno, Packs y Promos) usando `INSERT … ON CONFLICT DO NOTHING` por `title`.

## Frontend

### Header desktop (`src/components/Header.tsx`)
- Reemplazar el árbol actual basado en `categories.menu_column` por un fetch de `mega_menu_columns + items` agrupado por `parent_nav`.
- Render: panel ancho con grid de columnas; cada columna = título en bold + lista de items + enlace "Ver todo" en color de acento.
- Items resueltos a `<Link>` reales con `href` correcto (SEO). Si `open_in_new_tab`, añadir `target="_blank" rel="noopener"`.
- Mantener realtime: subscripción a `mega_menu_columns`, `mega_menu_items`, `categories`, `goals`, `seo_redirects` para recargar.

### Mobile (acordeón)
- Reusar el mismo dataset, render como `<Accordion>` shadcn con tres niveles (columna → item → sub si el item es categoría con hijos visibles).
- Respetar `show_mobile`.

### Página índice `/objetivos`
- Listar `goals` activos como tarjetas con imagen, nombre y `short_description`.
- SEO: `title`, `meta_description`, canonical y JSON-LD `CollectionPage`.

### Resolución de redirecciones
- Helper `resolveCanonicalPath(path)` que consulta cache local de `seo_redirects` y devuelve `to_path` si está activa. Aplicado al armar `href` del menú.

## Admin

Nueva sección "Gestión de Mega Menú" dentro de **Enlaces de sitio**:

```text
[+ Nueva columna]
┌──────────────────────────────────────────────┐
│ ▼ Productos                                  │
│   Título: Superfoods Andinos                 │
│   Asociado a: Productos (nav top)            │
│   Mostrar: ☑ desktop ☑ mobile  ☑ activo     │
│   "Ver todo" → /categoria/superfoods-andinos │
│   Items (drag & drop):                       │
│    • Maca         [categoría]  ☑ ☑ ✎ 🗑     │
│    • Cañihua      [categoría]  ☑ ☑ ✎ 🗑     │
│    • Pack energía [URL]        ☑ ☑ ✎ 🗑     │
│   [+ Agregar item]                           │
└──────────────────────────────────────────────┘
```

Formulario de item:
- Nombre visible (no toca slug).
- Tipo: categoría / objetivo / página / URL.
- Selector dinámico según tipo (autocompletar categorías y objetivos).
- Icono, imagen, abrir en nueva pestaña, mostrar desktop/mobile, activo, orden, nota SEO interna.

Vista previa: panel a la derecha que renderiza el mega menú con los datos en edición (sin publicar).

Archivos nuevos:
- `src/components/admin/MegaMenuBuilder.tsx`
- `src/components/admin/MegaMenuColumnEditor.tsx`
- `src/components/admin/MegaMenuItemEditor.tsx`
- `src/components/admin/MegaMenuPreview.tsx`
- `src/pages/Goals.tsx` (índice `/objetivos`)
- `src/lib/megaMenu.ts` (loader + cache + resolveCanonicalPath)

Archivos editados:
- `src/components/Header.tsx` (desktop + mobile).
- `src/pages/admin/AdminSiteLinks.tsx` (montar el builder).
- `src/App.tsx` (ruta `/objetivos`).
- `scripts/generate-sitemap.ts` (ya incluye goals; agregar `/objetivos`).

## Compatibilidad y migración suave

- No elimino `menu_custom_fields` ni los campos `menu_*` de `categories` en esta iteración; quedan como fallback si `mega_menu_columns` está vacío, para que nada se rompa al desplegar.
- Si el admin guarda al menos una columna en el nuevo builder, el Header usa el nuevo sistema; si no hay ninguna, sigue usando el árbol actual.

## Fuera de alcance de este sprint

- Drag & drop entre columnas se entrega con orden manual por inputs numéricos + flechas; podemos añadir DnD después si lo pides.
- Versionado/borrador del menú (publicar vs draft): por ahora "guardar" publica directo; vista previa en admin antes de guardar.

## Confirmaciones que necesito antes de implementar

1. ¿OK con crear las dos tablas nuevas (`mega_menu_columns`, `mega_menu_items`) y dejar el sistema actual como fallback? Es lo más seguro y reversible.
2. ¿El item top "Compra por objetivo" debe ser una opción fija del nav superior, o uno más en `nav_links` administrable?
3. ¿Quieres que el seed inicial copie el ejemplo del brief (Productos / Compra por objetivo / Superfoods / Proteínas / Packs), o prefieres empezar vacío y configurarlo tú?
