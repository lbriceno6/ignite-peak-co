create extension if not exists unaccent with schema extensions;

create extension if not exists pg_trgm with schema extensions;

create or replace function public.immutable_unaccent(text)
returns text language sql immutable strict parallel safe as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

alter table public.products
  add column if not exists search_text text
  generated always as (
    public.immutable_unaccent(lower(
      coalesce(name,'') || ' ' || coalesce(slug,'') || ' ' ||
      coalesce(short_description,'') || ' ' || coalesce(description,'') || ' ' ||
      coalesce(category,'') || ' ' || coalesce(subcategory,'') || ' ' ||
      coalesce(brand,'') || ' ' || coalesce(main_ingredient,'')
    ))
  ) stored;

create index if not exists products_search_text_trgm
  on public.products using gin (search_text public.gin_trgm_ops);

-- Verificación: debe devolver productos, no vacío
select name from products where search_text ilike '%colageno%';
select name from products where search_text ilike '%proteina%';