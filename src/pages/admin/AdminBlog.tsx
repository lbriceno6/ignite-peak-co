import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function AdminBlog() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, value: boolean) => {
    const { error } = await supabase.from("blog_posts").update({ is_published: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Post published" : "Post unpublished");
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
          <p className="text-muted-foreground">{items.length} total</p>
        </div>
        <Button asChild variant="dark"><Link to="/admin/blog/new"><Plus size={16} /> New post</Link></Button>
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
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.cover_image && <img src={p.cover_image} alt="" className="h-12 w-16 rounded object-cover" />}
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{p.category}</td>
                <td className="p-3">{new Date(p.published_at).toLocaleDateString()}</td>
                <td className="p-3"><Switch checked={p.is_published} onCheckedChange={(v) => togglePublished(p.id, v)} /></td>
                <td className="p-3 text-right">
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/blog/${p.id}/edit`}><Pencil size={16} /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 size={16} /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No posts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
