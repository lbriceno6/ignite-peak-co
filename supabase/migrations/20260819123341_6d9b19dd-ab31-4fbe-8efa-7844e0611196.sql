alter table public.seo_landing_pages
  add column if not exists keyword_secondary jsonb not null default '[]'::jsonb,
  add column if not exists editorial_status text not null default 'unreviewed',
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists show_review_info boolean not null default false,
  add column if not exists content_score integer,
  add column if not exists content_report jsonb,
  add column if not exists previous_version jsonb,
  add column if not exists humanized_at timestamptz,
  add column if not exists hero_image_model text;