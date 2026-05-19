create table public.goal_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cta_label text,
  cta_href text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_cards enable row level security;

create policy "Anyone can view active goal cards" on public.goal_cards
  for select using (is_active = true or has_role(auth.uid(), 'admin'::app_role));
create policy "Admins insert goal cards" on public.goal_cards
  for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins update goal cards" on public.goal_cards
  for update to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins delete goal cards" on public.goal_cards
  for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));

create trigger goal_cards_set_updated_at
  before update on public.goal_cards
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.goal_cards;

insert into public.goal_cards (slug, name, description, cta_label, cta_href, sort_order) values
  ('build-muscle', 'Build Muscle', 'High-protein essentials', 'Shop', '/category/goal-build-muscle', 1),
  ('lose-fat',     'Lose Fat',     'Lean & cutting formulas', 'Shop', '/category/goal-lose-fat', 2),
  ('energy',       'More Energy',  'Pre-workouts & boosters', 'Shop', '/category/goal-energy', 3),
  ('recovery',     'Better Recovery', 'BCAAs, glutamine, sleep', 'Shop', '/category/goal-recovery', 4),
  ('wellness',     'Daily Wellness', 'Vitamins & immunity', 'Shop', '/category/goal-wellness', 5);
