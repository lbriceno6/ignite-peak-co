import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
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
  const [cats, setCats] = useState<{ name: string; icon: string | null; description: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (slug) {
        const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
        setPost(data as Post | null);
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
    return ["All", ...Array.from(new Set([...fromDb, ...fromPosts]))];
  }, [posts, cats]);

  const catMeta = useMemo(() => {
    const m = new Map<string, { icon: string | null; description: string | null }>();
    cats.forEach((c) => m.set(c.name, { icon: c.icon, description: c.description }));
    return m;
  }, [cats]);

  const filtered = posts.filter((p) => {
    const matchCat = activeCat === "All" || p.category === activeCat;
    const matchQ = !q || p.title.toLowerCase().includes(q.toLowerCase()) || (p.excerpt ?? "").toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  // Single post view
  if (slug) {
    return (
      <Layout>
        <article className="container-x py-12">
          <Link to="/blog" className="text-xs font-bold uppercase tracking-wider text-accent">← Back to all articles</Link>
          {loading ? (
            <p className="mt-10 text-muted-foreground">Loading…</p>
          ) : !post ? (
            <p className="mt-10 text-muted-foreground">Article not found.</p>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                {post.category && <span className="font-bold text-accent">{post.category}</span>}
                {post.read_time && <span>· {post.read_time} read</span>}
                <span>· {new Date(post.published_at).toLocaleDateString()}</span>
              </div>
              <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{post.title}</h1>
              {post.excerpt && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{post.excerpt}</p>}
              {post.cover_image && (
                <img src={post.cover_image} alt={post.title} className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" />
              )}
              {post.content && (
                <div className="prose prose-neutral mt-8 max-w-2xl whitespace-pre-wrap text-base leading-relaxed">
                  {post.content}
                </div>
              )}
            </>
          )}
        </article>
      </Layout>
    );
  }

  // List view
  return (
    <Layout>
      <section className="bg-surface-darker py-16 text-background">
        <div className="container-x">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Knowledge hub</span>
          <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Guides & insights</h1>
          <p className="mt-3 max-w-xl text-background/70">Practical advice from our nutritionists, coaches and athletes — no fluff.</p>
          <div className="mt-6 flex max-w-md gap-2">
            <Input
              placeholder="Search articles..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
            />
            <Button variant="accent">Search</Button>
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

        {activeCat !== "All" && catMeta.get(activeCat)?.description && (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{catMeta.get(activeCat)?.description}</p>
        )}

        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading articles…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-muted-foreground">No articles yet. Check back soon.</p>
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
                  {post.read_time && <span>· {post.read_time} read</span>}
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
