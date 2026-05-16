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

alter table public.blog_posts add column is_featured boolean not null default false;
alter table public.blog_posts add column featured_order int;
create index blog_posts_featured_idx on public.blog_posts (is_featured, featured_order);

insert into public.site_content(key,value) values
  ('home.guides.eyebrow','Knowledge'),
  ('home.guides.title','Guides & Insights'),
  ('home.guides.subtitle',''),
  ('home.guides.cta_label','All articles'),
  ('home.guides.cta_href','/blog')
on conflict (key) do nothing;