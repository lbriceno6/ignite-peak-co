# Módulo SEO Inteligente — Nutribatidos

Voy a implementar el módulo en 3 etapas como sugieres. Cada etapa se entrega completa y funcional antes de pasar a la siguiente.

---

## Etapa 1 — SEO básico (manual + estructura)

**Base de datos**
- Tabla `seo_meta` (polimórfica): `entity_type` (product|category|blog|page), `entity_id`, `slug`, `seo_title`, `seo_description`, `keywords[]`, `tags[]`, `og_image`, `canonical`, `schema_jsonld`, `noindex`, `updated_at`.
- Tabla `seo_image_alts`: `entity_type`, `entity_id`, `image_url`, `alt_text`.
- Tabla `seo_settings` (singleton): defaults globales, robots rules, plantillas.
- RLS: lectura pública; escritura solo admin.

**Frontend público**
- Componente `<SEO>` ampliado para leer de `seo_meta` por ruta (producto/categoría/blog) con fallback a campos del producto.
- JSON-LD `Product` con price, availability, brand, rating, reviewCount, image.
- JSON-LD `BreadcrumbList` en producto y categoría.
- `alt` real en todas las imágenes de producto desde `seo_image_alts`.

**Sitemap y robots**
- `scripts/generate-sitemap.ts` con hooks `predev`/`prebuild` que enumera rutas estáticas + productos activos + categorías + posts publicados.
- `public/robots.txt` actualizado con `Sitemap:` directive.

**Admin**
- Página `/admin/seo` con tabs: Productos, Categorías, Blog, Ajustes.
- En `ProductForm.tsx` y `BlogForm.tsx`: nueva sección "SEO" (collapse) con título, descripción, slug, keywords, tags, OG image, noindex, vista previa de snippet Google.
- Editor de alt text por imagen (galería).

---

## Etapa 2 — IA + Score + Masivo

**IA (Lovable AI Gateway)**
- Edge function `seo-generate` (modelo `google/gemini-3-flash-preview`) que recibe `{entity_type, entity_id, fields[]}` y devuelve sugerencias estructuradas (Zod schema): title, description, slug, keywords, tags, alt texts, FAQs, short/long description, Google Shopping title/description.
- Edge function `seo-score` que calcula score 0–100 según reglas: largo de título (50–60), meta (140–160), keyword density, alt text presente, slug limpio, schema válido, imágenes con alt, FAQs, etc. Devuelve `{score, issues[], suggestions[]}`.
- Tabla `seo_suggestions`: guarda sugerencia IA pendiente con `status` (pending|accepted|rejected), permite review antes de publicar.

**Admin UI**
- Botón **"Generar SEO con IA"** en ProductForm/BlogForm → abre modal con diff lado a lado (actual vs sugerido) por campo, checkboxes para aceptar parcialmente.
- Editor de FAQs sugeridas (acept/edit/reject por FAQ).
- En `/admin/seo`:
  - **Panel general**: contadores (optimizados / con errores / sin SEO), score promedio, top issues.
  - Tabla de productos con score, estado, último análisis, acciones (regenerar, editar).
  - **Optimización masiva**: seleccionar N productos → cola asincrónica vía edge function que procesa de a uno (con rate limit), barra de progreso, log de resultados.

---

## Etapa 3 — Merchant, llms.txt, buscador avanzado

**Google Merchant Center**
- Edge function pública `merchant-feed` que devuelve XML RSS 2.0 con namespace `g:` (id, title, description, link, image_link, availability, price, brand, gtin, condition, google_product_category).
- Usa los campos Shopping de Etapa 2.
- Endpoint cacheado: `https://<project>.functions.supabase.co/merchant-feed`.

**llms.txt**
- `public/llms.txt` generado por el mismo script de sitemap, con secciones por categoría, excluyendo admin/auth/reseller/supplier.

**Buscador interno avanzado**
- Tabla `product_search_terms`: `product_id`, `term`, `weight`, `kind` (keyword|benefit|ingredient|synonym).
- Migración: índice GIN trigram (`pg_trgm`) en `products.name`, `description`, y en `product_search_terms.term` para tolerar errores de escritura.
- RPC `search_products(q text)` que combina: full-text en español + similitud trigram + match en sinónimos/beneficios, con ranking ponderado.
- Reemplazar el buscador actual (`/buscar`) por esta RPC, mostrando "¿Quisiste decir...?" cuando hay match por similitud baja.
- IA puebla `product_search_terms` (sinónimos, beneficios, errores comunes) durante la generación SEO.

**Páginas SEO automáticas**
- Rutas dinámicas tipo `/objetivo/:slug`, `/ingrediente/:slug`, `/beneficio/:slug` que listan productos filtrados, con title/description/JSON-LD generado por IA y cacheado en `seo_meta`.
- Generador admin: "Crear página SEO" desde lista de keywords trending.

---

## Detalles técnicos clave

- Stack: React + Vite + react-helmet-async (ya existe), Tailwind, shadcn, Supabase, Lovable AI Gateway.
- IA: nunca expone `LOVABLE_API_KEY` al cliente; todo via edge function con `verify_jwt` y check admin.
- Costo IA: usar `gemini-3-flash-preview` por defecto; permitir override a `gpt-5-mini` en ajustes.
- Multi-idioma: por ahora solo español (estructura permite agregar `locale` después).
- Reversible: sugerencias en `seo_suggestions` con historial; el admin siempre puede rollback al snapshot anterior.

---

## Entrega

Confirma y arranco con **Etapa 1**. Al terminarla y validarla, sigo con Etapa 2 y luego Etapa 3.
