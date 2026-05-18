create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text,
  title text not null default '',
  subtitle text,
  image_url text,
  primary_label text,
  primary_href text,
  secondary_label text,
  secondary_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

create policy "Anyone can view active hero slides"
  on public.hero_slides for select
  using (is_active = true or has_role(auth.uid(), 'admin'));

create policy "Admins insert hero slides"
  on public.hero_slides for insert to authenticated
  with check (has_role(auth.uid(), 'admin'));

create policy "Admins update hero slides"
  on public.hero_slides for update to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

create policy "Admins delete hero slides"
  on public.hero_slides for delete to authenticated
  using (has_role(auth.uid(), 'admin'));

create trigger hero_slides_updated_at
  before update on public.hero_slides
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.hero_slides;