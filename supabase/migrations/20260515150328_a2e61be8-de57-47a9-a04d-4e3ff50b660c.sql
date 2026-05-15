
-- Blog posts table
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  category text,
  cover_image text,
  read_time text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create policy "Anyone can view published posts"
on public.blog_posts for select
using (is_published = true or has_role(auth.uid(), 'admin'::app_role));

create policy "Admins insert posts"
on public.blog_posts for insert to authenticated
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update posts"
on public.blog_posts for update to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete posts"
on public.blog_posts for delete to authenticated
using (has_role(auth.uid(), 'admin'::app_role));

create trigger blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

create index idx_blog_posts_published on public.blog_posts(is_published, published_at desc);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('blog-images', 'blog-images', true);

create policy "Public can view blog images"
on storage.objects for select
using (bucket_id = 'blog-images');

create policy "Admins upload blog images"
on storage.objects for insert to authenticated
with check (bucket_id = 'blog-images' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update blog images"
on storage.objects for update to authenticated
using (bucket_id = 'blog-images' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete blog images"
on storage.objects for delete to authenticated
using (bucket_id = 'blog-images' and has_role(auth.uid(), 'admin'::app_role));
