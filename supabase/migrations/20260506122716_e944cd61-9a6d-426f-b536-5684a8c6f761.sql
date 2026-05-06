
-- Roles
create type public.app_role as enum ('admin', 'client');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users can insert own profile" on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile + assign client role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Orders
create type public.order_status as enum ('pending','confirmed','preparing','shipped','delivered','cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  order_code text not null unique default ('VLT-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,8))),
  status order_status not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'card',
  shipping_name text,
  shipping_address text,
  shipping_city text,
  shipping_postal_code text,
  shipping_country text,
  shipping_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create policy "Users view own orders" on public.orders for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Users create own orders" on public.orders for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Admins update orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_slug text not null,
  product_name text not null,
  product_image text,
  variant text,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;

create policy "Users view own order items" on public.order_items for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin')))
  );
create policy "Users create order items for own orders" on public.order_items for insert to authenticated
  with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
