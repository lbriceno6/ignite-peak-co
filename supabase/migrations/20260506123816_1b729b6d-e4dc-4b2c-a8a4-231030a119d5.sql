
-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric not null default 0,
  sale_price numeric,
  category text,
  main_ingredient text,
  goal text,
  flavor text,
  size text,
  stock integer not null default 0,
  main_image text,
  gallery_images jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  badge text,
  usage_instructions text,
  ingredients text,
  nutrition_facts jsonb,
  faqs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Anyone can view active products"
on public.products for select
using (is_active = true or public.has_role(auth.uid(), 'admin'));

create policy "Admins insert products"
on public.products for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins update products"
on public.products for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete products"
on public.products for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  user_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

create policy "Anyone can view reviews"
on public.reviews for select using (true);

create policy "Users create own reviews"
on public.reviews for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update own reviews"
on public.reviews for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own reviews or admin"
on public.reviews for delete to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- CART
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);
alter table public.cart_items enable row level security;

create policy "Users manage own cart"
on public.cart_items for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- WISHLIST
create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlist enable row level security;

create policy "Users manage own wishlist"
on public.wishlist for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow admins to view all profiles list (already covered via has_role in existing policy)
-- Allow admins to view all user_roles already exists.

-- Helpful: allow admins to read all profiles & all orders is covered by existing has_role checks.
