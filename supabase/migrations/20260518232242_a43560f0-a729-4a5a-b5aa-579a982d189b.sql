
-- Home blocks: reorderable, toggleable, editable sections on the home page
create table public.home_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique,
  block_type text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  eyebrow text,
  title text,
  subtitle text,
  cta_label text,
  cta_href text,
  cta2_label text,
  cta2_href text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_blocks enable row level security;

create policy "Anyone can view active home blocks" on public.home_blocks
  for select using (is_active = true or has_role(auth.uid(), 'admin'::app_role));
create policy "Admins insert home blocks" on public.home_blocks
  for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins update home blocks" on public.home_blocks
  for update to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins delete home blocks" on public.home_blocks
  for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));

create trigger home_blocks_updated_at before update on public.home_blocks
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.home_blocks;

insert into public.home_blocks (block_key, block_type, sort_order, eyebrow, title, subtitle, cta_label, cta_href) values
  ('hero',          'hero',          10, null, 'Hero carousel', 'Edited from "Hero carousel" page', null, null),
  ('categories',    'categories',    20, null, 'Shop by category', 'Find exactly what fuels your goals.', null, null),
  ('best_sellers',  'best_sellers',  30, 'Customer favorites', 'Best sellers', null, 'View all', '/category/protein'),
  ('goals',         'goals',         40, 'Find your stack', 'Shop by goal', null, null, null),
  ('promo',         'promo',         50, 'Limited time', 'Stack up. Save up to 30%.', 'Bundle protein + creatine + pre-workout and get our biggest discount of the season.', 'Shop the bundle', '/category/protein'),
  ('more_products', 'products_grid', 60, 'Just dropped', 'More to fuel your training', null, null, null),
  ('reviews',       'reviews',       70, null, 'Loved by athletes', 'Over 18,000 verified 5-star reviews.', null, null),
  ('blog',          'blog',          80, null, null, null, null, null),
  ('trust',         'trust',         90, null, null, null, null, null);
