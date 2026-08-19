alter table public.seo_landing_pages
  add column if not exists status text not null default 'draft',
  add column if not exists category_name text,
  add column if not exists hero_cta_label text,
  add column if not exists hero_cta_href text,
  add column if not exists canonical text,
  add column if not exists noindex boolean not null default false,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists sections jsonb not null default '{}'::jsonb,
  add column if not exists products_mode text not null default 'auto',
  add column if not exists product_ids jsonb not null default '[]'::jsonb;

update public.seo_landing_pages set status = case when is_published then 'published' else 'draft' end;