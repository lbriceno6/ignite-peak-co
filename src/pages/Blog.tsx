import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SEO, toAbsoluteUrl, DEFAULT_OG_IMAGE } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  cover_image: string | null;
  content: string | null;
  published_at: string;
};

const Blog = () => {
  const { slug } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [cats, setCats] = useState<{ name: string; icon: string | null; description: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("Todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (slug) {
        const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
        const current = data as Post | null;
        setPost(current);
        // Artículos relacionados: prioriza la misma categoría, completa con recientes.
        if (current) {
          const { data: rel } = await supabase
            .from("blog_posts")
            .select("id,slug,title,excerpt,category,read_time,cover_image,published_at,content")
            .eq("is_published", true)
            .neq("id", current.id)
            .order("published_at", { ascending: false })
            .limit(6);
          const cat = (current.category ?? "").trim().toLowerCase();
          const list = (rel as Post[]) ?? [];
          const sameCat = list.filter((r) => (r.category ?? "").trim().toLowerCase() === cat);
          const others = list.filter((r) => (r.category ?? "").trim().toLowerCase() !== cat);
          setRelated([...sameCat, ...others].slice(0, 3));
        } else {
          setRelated([]);
        }
      } else {
        const [postsRes, catsRes] = await Promise.all([
          supabase.from("blog_posts").select("*").eq("is_published", true).order("published_at", { ascending: false }),
          supabase.from("categories").select("name,icon,description,sort_order").eq("type", "blog").order("sort_order").order("name"),
        ]);
        setPosts((postsRes.data as Post[]) ?? []);
        setCats((catsRes.data as any[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const categories = useMemo(() => {
    const fromDb = cats.map((c) => c.name);
    const fromPosts = posts.map((p) => p.category).filter(Boolean) as string[];
    const seen = new Map<string, string>();
    [...fromDb, ...fromPosts].forEach((n) => {
      const k = n.trim().toLowerCase();
      if (k && !seen.has(k)) seen.set(k, n.trim());
    });
    return ["Todos", ...seen.values()];
  }, [posts, cats]);

  const catMeta = useMemo(() => {
    const m = new Map<string, { icon: string | null; description: string | null }>();
    cats.forEach((c) => m.set(c.name, { icon: c.icon, description: c.description }));
    return m;
  }, [cats]);

  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  const filtered = posts.filter((p) => {
    const matchCat = activeCat === "Todos" || norm(p.category) === norm(activeCat);
    const matchQ = !q || p.title.toLowerCase().includes(q.toLowerCase()) || (p.excerpt ?? "").toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  // Single post view
  if (slug) {
    const articleJsonLd = post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt ?? undefined,
          image: toAbsoluteUrl(post.cover_image) ?? DEFAULT_OG_IMAGE,
          datePublished: post.published_at,
          articleSection: post.category ?? undefined,
          mainEntityOfPage: `https://ignite-peak-co.lovable.app/blog/${post.slug}`,
          publisher: { "@type": "Organization", name: "Nutribatidos" },
        }
      : undefined;
    return (
      <Layout>
        {post && (
          <SEO
            title={`${post.title} | Blog Nutribatidos`}
            description={post.excerpt ?? undefined}
            path={`/blog/${post.slug}`}
            image={post.cover_image ?? undefined}
            type="article"
            publishedTime={post.published_at}
            jsonLd={articleJsonLd}
          />
        )}
        <article className="container-x py-12">
          {loading ? (
            <p className="mt-10 text-center text-muted-foreground">Cargando…</p>
          ) : !post ? (
            <p className="mt-10 text-center text-muted-foreground">Artículo no encontrado.</p>
          ) : (
            <>
              {/* Header tipo revista, centrado */}
              <header className="mx-auto max-w-3xl text-center">
                <Link to="/blog" className="text-xs font-bold uppercase tracking-wider text-accent">
                  ← Volver a todos los artículos
                </Link>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {post.category && <span className="font-bold text-accent">{post.category}</span>}
                  {post.read_time && <span>· {post.read_time} de lectura</span>}
                  <span>· {new Date(post.published_at).toLocaleDateString()}</span>
                </div>
                <h1 className="mt-4 font-display text-4xl uppercase leading-[1.05] sm:text-5xl">{post.title}</h1>
                {post.excerpt && (
                  <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{post.excerpt}</p>
                )}
              </header>

              {post.cover_image && (
                <figure className="mx-auto mt-10 max-w-4xl">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm ring-1 ring-border/50"
                  />
                </figure>
              )}

              {post.content && (
                <div className="prose prose-neutral prose-lg mx-auto mt-12 max-w-2xl whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </div>
              )}

              {/* Artículos relacionados */}
              {related.length > 0 && (
                <section className="mx-auto mt-20 max-w-5xl border-t pt-10">
                  <h2 className="font-display text-2xl uppercase tracking-tight">Sigue leyendo</h2>
                  <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {related.map((r) => (
                      <Link key={r.id} to={`/blog/${r.slug}`} className="group flex flex-col gap-3">
                        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gradient-hero">
                          {r.cover_image ? (
                            <img
                              src={r.cover_image}
                              alt={r.title}
                              className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-6xl opacity-30">📝</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                          {r.category && <span className="font-bold text-accent">{r.category}</span>}
                          {r.read_time && <span>· {r.read_time}</span>}
                        </div>
                        <h3 className="font-display text-lg leading-snug transition-smooth group-hover:text-accent">{r.title}</h3>
                        {r.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </article>
      </Layout>
    );
  }

  // List view
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Nutribatidos — Guías y consejos",
    url: "https://ignite-peak-co.lovable.app/blog",
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://ignite-peak-co.lovable.app/blog/${p.slug}`,
      datePublished: p.published_at,
      image: toAbsoluteUrl(p.cover_image) ?? DEFAULT_OG_IMAGE,
    })),
  };
  return (
    <Layout>
      <SEO
        title="Guías y consejos | Blog Nutribatidos"
        description="Consejos prácticos de bienestar natural: superalimentos andinos, rutinas saludables y recetas con maca, cañihua y espirulina."
        path="/blog"
        type="website"
        jsonLd={blogJsonLd}
      />
      <section className="bg-surface-darker py-16 text-background">
        <div className="container-x">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Knowledge hub</span>
          <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Guías y consejos</h1>
          <p className="mt-3 max-w-xl text-background/70">Información útil para tu bienestar diario, sin paja.</p>
          <div className="mt-6 flex max-w-md gap-2">
            <Input
              placeholder="Buscar artículos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
            />
            <Button variant="accent">Buscar</Button>
          </div>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="flex flex-wrap gap-2">
          {categories.map((t) => {
            const meta = catMeta.get(t);
            return (
              <button
                key={t}
                onClick={() => setActiveCat(t)}
                title={meta?.description ?? undefined}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-smooth ${
                  activeCat === t ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground"
                }`}
              >
                {meta?.icon && <span className="mr-1">{meta.icon}</span>}
                {t}
              </button>
            );
          })}
        </div>

        {activeCat !== "Todos" && catMeta.get(activeCat)?.description && (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{catMeta.get(activeCat)?.description}</p>
        )}

        {loading ? (
          <p className="mt-10 text-muted-foreground">Cargando artículos…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-muted-foreground">Aún no hay artículos. Vuelve pronto.</p>
        ) : (
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group flex flex-col gap-3">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gradient-hero">
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-7xl opacity-30">📝</div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {post.category && <span className="font-bold text-accent">{post.category}</span>}
                  {post.read_time && <span>· {post.read_time} de lectura</span>}
                </div>
                <h2 className="font-display text-xl transition-smooth group-hover:text-accent">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-muted-foreground">{post.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Blog;
