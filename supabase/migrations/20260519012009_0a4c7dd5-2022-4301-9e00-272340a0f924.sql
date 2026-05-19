create table if not exists public.nav_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nav_links enable row level security;

create policy "Anyone can view active nav links"
on public.nav_links for select
using (is_active = true or has_role(auth.uid(), 'admin'));

create policy "Admins insert nav links"
on public.nav_links for insert to authenticated
with check (has_role(auth.uid(), 'admin'));

create policy "Admins update nav links"
on public.nav_links for update to authenticated
using (has_role(auth.uid(), 'admin'))
with check (has_role(auth.uid(), 'admin'));

create policy "Admins delete nav links"
on public.nav_links for delete to authenticated
using (has_role(auth.uid(), 'admin'));

create trigger nav_links_set_updated_at
before update on public.nav_links
for each row execute function public.set_updated_at();

insert into public.nav_links (label, href, sort_order) values
  ('Guides', '/blog', 0),
  ('About', '/about', 1),
  ('Contact', '/contact', 2)
on conflict do nothing;

insert into public.site_content (key, value) values
  ('logo_text', 'VOLT'),
  ('logo_accent', 'RA'),
  ('logo_image_url', '')
on conflict (key) do nothing;
