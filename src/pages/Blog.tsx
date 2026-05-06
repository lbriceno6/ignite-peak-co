import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blogPosts } from "@/data/catalog";

const Blog = () => (
  <Layout>
    <section className="bg-surface-darker py-16 text-background">
      <div className="container-x">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Knowledge hub</span>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">Guides & insights</h1>
        <p className="mt-3 max-w-xl text-background/70">Practical advice from our nutritionists, coaches and athletes — no fluff.</p>
        <div className="mt-6 flex max-w-md gap-2">
          <Input placeholder="Search articles..." className="bg-background/10 border-background/20 text-background placeholder:text-background/50" />
          <Button variant="accent">Search</Button>
        </div>
      </div>
    </section>

    <section className="container-x py-12">
      <div className="flex flex-wrap gap-2">
        {["All", "Nutrition", "Supplements", "Performance", "Recovery", "Wellness"].map((t, i) => (
          <button key={t} className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-smooth ${i === 0 ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[...blogPosts, ...blogPosts].map((post, i) => (
          <Link key={i} to={`/blog/${post.slug}`} className="group flex flex-col gap-3">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gradient-hero">
              <div className="grid h-full place-items-center text-7xl opacity-30 transition-smooth group-hover:scale-110">
                {post.category === "Nutrition" ? "🥗" : post.category === "Supplements" ? "💪" : "⚡"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="font-bold text-accent">{post.category}</span>· {post.readTime} read
            </div>
            <h2 className="font-display text-xl group-hover:text-accent transition-smooth">{post.title}</h2>
            <p className="text-sm text-muted-foreground">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  </Layout>
);

export default Blog;
