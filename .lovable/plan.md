## Goal
Add full visual control of every Home carousel from **Home page sections** in the admin, both globally and per-carousel, without affecting catalog / product / category pages.

## Scope (Home carousels only)
Ofertas, Best sellers, Promociones, Recomendados IA, Productos vistos, Favoritos, Destacados, Carrusel manual de productos, Carrusel por categoría, Carrusel por promoción.

---

## 1. Data model

New table `public.home_carousel_global` (single row, key='default'):
- width preset + max-width per device, padding per device
- items per device, gap per device
- card min-height/width, equal height, button bottom
- image height per device, object-fit, object-position
- controls: arrows, dots, autoplay, speed, loop, free-scroll mobile
- background: type (transparent/white/soft-gray/solid/gradient), color1, color2, gradient direction, opacity, radius, padding, margin-top, margin-bottom

Extend `home_blocks.config` (jsonb already exists) for every carousel-type block with:
- `useGlobalLayout: boolean` (default true)
- `useGlobalBackground: boolean` (default true)
- `layout: { ...same shape as global layout }`
- `background: { ...same shape as global background }`

No schema change beyond the global table; per-carousel overrides live in the existing `config` jsonb.

## 2. New shared util `src/lib/homeCarouselDesign.ts`
- `CarouselLayoutCfg`, `CarouselBackgroundCfg` types + defaults
- `PRESETS` (Compacto, Ecommerce limpio, Amplio premium, Pantalla completa, Mobile optimizado, Fondo destacado)
- `mergeLayout(global, block)` and `mergeBackground(global, block)`
- `buildScopedCss(scopeId, layout, background)` → emits responsive CSS with media queries scoped to `#hcs-{id}` controlling: container max-width, padding, item flex-basis (= `calc(100% / items - gap)`), gap, card min-h/min-w, image height, background, radius, margins. Returns `{ css, containerProps }`.

## 3. Frontend rendering
- `HomeProductsCarousel.tsx`: accept optional `design?: { layout, background }` prop. Wrap output in `<section id="hcs-{id}" className="hcs-scope">` with injected `<style>` from `buildScopedCss`. Use `items` from layout to drive `basis` of `CarouselItem` per breakpoint via CSS custom properties. Show/hide arrows/dots + autoplay plugin based on controls.
- `ProductCard.tsx`: already has `data-pc` hooks from earlier work; ensure `image-wrap` height + `object-fit`/`object-position` honor the scope CSS variables.
- `Index.tsx`: load global config once (hook `useHomeCarouselGlobal`), pass merged `design` to every carousel rendering (products carousel, category carousel, promotion carousel, AI reco, recently viewed, favorites, ofertas, best sellers, destacados, promociones).
- Scope is `.hcs-scope` (Home only) so catalog / category / product / checkout pages are untouched.

## 4. Admin UI (inside `AdminHomeBlocks.tsx`, no new page)
At top of the page, new accordion **"Configuración global de carruseles"** with subsections:
- Tamaño y ancho (width preset + per-device max-width, padding)
- Productos visibles y separación
- Tamaño de cards e imagen
- Controles del carrusel
- Fondo del carrusel (type, colors, opacity, radius, paddings, margins)
- Presets (apply preset button)
- Live preview (3 mock products: short name, long name, sale price) with Desktop / Tablet / Mobile toggle

Inside each carousel-type block editor, new accordion **"Diseño del carrusel"**:
- Toggle "Usar configuración global" (layout)
- Toggle "Usar fondo global" (background)
- When off → render the same field set as global, scoped to that block
- Same live preview component

Persistence: global table via supabase upsert; per-block via existing config jsonb.

## 5. Card alignment guarantees
CSS emitted by `buildScopedCss` enforces:
- `.hcs-scope [data-pc="card"] { display:flex; flex-direction:column; height:100%; }`
- `.hcs-scope [data-pc="content"] { flex:1; display:flex; flex-direction:column; }`
- `.hcs-scope [data-pc="button-wrap"] { margin-top:auto; }`
- `.hcs-scope [data-pc="image-wrap"] { height: var(--hcs-img-h); }`
- `.hcs-scope [data-pc="image"] { object-fit: contain; object-position: center; width:100%; height:100%; }`
- Title/desc/category line-clamps via existing typography settings (no override here).

## 6. Files

**New**
- `supabase/migrations/<ts>_home_carousel_global.sql` (table + grants + RLS: read anon; write admin via has_role)
- `src/lib/homeCarouselDesign.ts`
- `src/hooks/useHomeCarouselGlobal.ts`
- `src/components/admin/HomeCarouselDesignEditor.tsx` (reusable for global + per-block)
- `src/components/admin/HomeCarouselPreview.tsx`

**Edited**
- `src/components/HomeProductsCarousel.tsx` (accept design prop, scoped CSS)
- `src/components/ProductCard.tsx` (ensure data-pc hooks honor scope vars — small additions only)
- `src/pages/Index.tsx` (load global, pass merged design to each carousel)
- `src/pages/admin/AdminHomeBlocks.tsx` (add global accordion at top + per-block "Diseño del carrusel" accordion)

## 7. Out of scope
- Catalog / category / product / checkout pages (untouched, different scope class).
- Hero banner, typography, layout systems (already separate).
