import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star, ArrowUp, ArrowDown, ImageOff } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  cover_image: string | null;
  is_published: boolean;
  is_featured: boolean;
  featured_order: number | null;
  published_at: string;
};

export default function AdminBlog() {
  const [items, setItems] = useState<Post[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,category,cover_image,is_published,is_featured,featured_order,published_at")
      .order("featured_order", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false });
    setItems((data as Post[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const featuredSorted = useMemo(
    () =>
      items
        .filter((p) => p.is_featured)
        .sort((a, b) => {
          const ao = a.featured_order ?? 9999;
          const bo = b.featured_order ?? 9999;
          if (ao !== bo) return ao - bo;
          return +new Date(b.published_at) - +new Date(a.published_at);
        }),
    [items],
  );
  const featuredCount = featuredSorted.length;
  const homeIds = new Set(featuredSorted.slice(0, 3).map((p) => p.id));

  const togglePublished = async (id: string, value: boolean) => {
    const { error } = await supabase.from("blog_posts").update({ is_published: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Post published" : "Post unpublished");
    load();
  };

  const toggleFeatured = async (post: Post, value: boolean) => {
    const update: any = { is_featured: value };
    if (value && post.featured_order == null) {
      update.featured_order = featuredCount + 1;
    }
    if (!value) update.featured_order = null;
    const { error } = await supabase.from("blog_posts").update(update).eq("id", post.id);
    if (error) return toast.error(error.message);
    load();
  };

  const move = async (post: Post, dir: -1 | 1) => {
    const idx = featuredSorted.findIndex((p) => p.id === post.id);
    const swap = featuredSorted[idx + dir];
    if (!swap) return;
    const a = post.featured_order ?? idx + 1;
    const b = swap.featured_order ?? idx + 1 + dir;
    const { error } = await supabase.from("blog_posts").upsert([
      { id: post.id, featured_order: b },
      { id: swap.id, featured_order: a },
    ]);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    load();
  };

  const filtered = items.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Blog posts</h1>
          <p className="text-muted-foreground">{items.length} total · {featuredCount} featured ({Math.min(3, featuredCount)} shown on home)</p>
        </div>
        <Button asChild variant="dark"><Link to="/admin/blog/new"><Plus size={16} /> New post</Link></Button>
      </div>

      <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
        Toggle <Star size={14} className="mx-1 inline" /> to mark a post as <strong className="text-foreground">Featured on home</strong>.
        The home page shows the first 3 featured posts ordered by the arrows. If you have less than 3, the most recent posts fill the gap.
      </div>

      <Input placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Post</th>
              <th className="p-3">Category</th>
              <th className="p-3">Published</th>
              <th className="p-3">Live</th>
              <th className="p-3">On home</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const fIdx = featuredSorted.findIndex((x) => x.id === p.id);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.cover_image ? (
                        <img src={p.cover_image} alt="" className="h-12 w-16 rounded object-cover" />
                      ) : (
                        <div className="grid h-12 w-16 place-items-center rounded bg-muted text-muted-foreground" title="No cover image">
                          <ImageOff size={16} />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{p.slug}</div>
                        {!p.cover_image && <div className="text-xs text-amber-600">Missing cover image</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{new Date(p.published_at).toLocaleDateString()}</td>
                  <td className="p-3"><Switch checked={p.is_published} onCheckedChange={(v) => togglePublished(p.id, v)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFeatured(p, !p.is_featured)}
                        title={p.is_featured ? "Unfeature" : "Feature on home"}
                        className={p.is_featured ? "text-accent" : "text-muted-foreground hover:text-foreground"}
                      >
                        <Star size={18} fill={p.is_featured ? "currentColor" : "none"} />
                      </button>
                      {p.is_featured && (
                        <>
                          <span className={`text-xs ${homeIds.has(p.id) ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            #{fIdx + 1}{homeIds.has(p.id) ? "" : " (hidden)"}
                          </span>
                          <Button variant="ghost" size="icon" disabled={fIdx === 0} onClick={() => move(p, -1)}>
                            <ArrowUp size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={fIdx === featuredSorted.length - 1} onClick={() => move(p, 1)}>
                            <ArrowDown size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button asChild variant="ghost" size="icon"><Link to={`/admin/blog/${p.id}/edit`}><Pencil size={16} /></Link></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No posts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
