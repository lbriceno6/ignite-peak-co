-- La búsqueda del sitio no encontraba productos con tilde.
--
-- `liveSearch` normaliza lo que escribe el usuario y le quita las tildes, y
-- después busca con ILIKE contra las columnas tal como están guardadas. ILIKE
-- ignora mayúsculas pero NO ignora tildes, así que '%colageno%' nunca encontró
-- "Colágeno". Y como la normalización se aplica siempre, tampoco lo encontraba
-- quien escribía la tilde correctamente: la consulta que sale es la misma.
--
-- El arreglo es guardar una versión normalizada del texto en la propia base y
-- buscar contra ella. La columna es generada: se recalcula sola cuando cambia
-- el producto, no hay nada que sincronizar desde la aplicación.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- `unaccent(text)` es STABLE, porque su resultado depende del diccionario
-- activo en la sesión, y una columna generada exige IMMUTABLE. Fijando el
-- diccionario de forma explícita el resultado sí es constante, que es lo que
-- permite envolverla así.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

comment on function public.immutable_unaccent(text) is
  'unaccent con diccionario fijo, para poder usarlo en columnas generadas e índices.';

-- Un solo campo con todo el texto buscable, ya en minúsculas y sin tildes.
-- El orden de los campos no importa: la búsqueda es por coincidencia parcial.
alter table public.products
  add column if not exists search_text text
  generated always as (
    public.immutable_unaccent(lower(
      coalesce(name, '') || ' ' ||
      coalesce(slug, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(subcategory, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(main_ingredient, '')
    ))
  ) stored;

comment on column public.products.search_text is
  'Texto buscable normalizado (minúsculas, sin tildes). Generada: no escribir a mano.';

-- ILIKE '%algo%' no puede usar un índice normal porque el patrón empieza con
-- comodín. El índice de trigramas sí, y es lo que evita que la búsqueda haga
-- un recorrido completo de la tabla cuando crezca el catálogo.
create index if not exists products_search_text_trgm
  on public.products using gin (search_text extensions.gin_trgm_ops);
