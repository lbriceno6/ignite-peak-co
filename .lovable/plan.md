# Control editorial de "Guides & Insights"

Voy a darte control total sobre los 4 frentes que elegiste: textos del home, qué artículos aparecen y en qué orden, contenido de cada artículo (ya existe, lo reforzamos) y categorías (ya existe).

## 1. Textos de la sección en el home

Nueva tabla `site_content` (clave/valor) para guardar textos editables del home sin tocar código.

Claves iniciales del bloque Guides & Insights:
- `home.guides.eyebrow` → "Knowledge"
- `home.guides.title` → "Guides & Insights"
- `home.guides.subtitle` → (opcional, hoy no existe)
- `home.guides.cta_label` → "All articles"
- `home.guides.cta_href` → "/blog"

Nueva página **`/admin/home`** con formulario para editar estas claves. Queda lista para extender a otras secciones (Best Sellers, More to Fuel Your Training, hero, etc.) sin migraciones nuevas.

`src/pages/Index.tsx` lee desde `site_content` con fallback a los textos actuales.

## 2. Qué 3 artículos aparecen en el home y en qué orden

Añadir a `blog_posts`:
- `is_featured boolean default false`
- `featured_order int` (orden ascendente, NULLs al final)

En **`/admin/blog`** añado:
- Toggle "Destacado en el home" por artículo.
- Campos de orden (↑ ↓) entre los destacados.
- Aviso "Máx. 3 visibles en el home" (no es bloqueo, solo se muestran los 3 primeros por orden).

El home toma los `is_featured = true` ordenados por `featured_order, published_at desc`. Si hay menos de 3, completa con los más recientes publicados.

## 3. Contenido de cada artículo (cover, categoría, read time, excerpt)

`BlogForm` ya tiene todos los campos. Añado:
- Indicador visual "Falta cover image — se mostrará el emoji por defecto" para que sepas por qué algunas tarjetas salen con 🥗 💪 ⚡ en el home actual.
- Validación suave de excerpt (recomendado ≤ 160 caracteres para SEO/OG).

## 4. Categorías del blog

Ya existe `/admin/categories` con CRUD. Solo verifico que el link esté visible en el menú del admin.

## Detalles técnicos

**Migración SQL:**
```sql
-- Tabla de contenido editable del sitio
create table public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy "Anyone can view site content" on public.site_content for select using (true);
create policy "Admins manage site content" on public.site_content for all to authenticated
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- Destacados en home
alter table public.blog_posts add column is_featured boolean not null default false;
alter table public.blog_posts add column featured_order int;
create index blog_posts_featured_idx on public.blog_posts (is_featured, featured_order);

-- Semillas
insert into public.site_content(key,value) values
  ('home.guides.eyebrow','Knowledge'),
  ('home.guides.title','Guides & Insights'),
  ('home.guides.subtitle',''),
  ('home.guides.cta_label','All articles'),
  ('home.guides.cta_href','/blog')
on conflict (key) do nothing;
```

**Archivos nuevos:**
- `src/pages/admin/AdminHome.tsx` — editor de claves `home.guides.*`.
- `src/hooks/useSiteContent.ts` — hook que carga claves con fallback.

**Archivos modificados:**
- `src/App.tsx` — ruta `/admin/home`.
- `src/components/admin/AdminLayout.tsx` — link "Home content".
- `src/pages/Index.tsx` — consume `useSiteContent` y selecciona destacados.
- `src/pages/admin/AdminBlog.tsx` — toggle destacado + orden.
- `src/pages/admin/BlogForm.tsx` — aviso de cover faltante.

## Fuera de alcance (lo digo para que decidas)

- No toco diseño visual de las tarjetas del home.
- No creo un editor WYSIWYG para `content` (sigue siendo Markdown/texto).
- Si más adelante quieres editar Best Sellers / More to Fuel / hero, reutilizamos `site_content` con nuevas claves sin migración.

¿Lo lanzo así?
