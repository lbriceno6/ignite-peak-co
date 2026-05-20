import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { SeoEditor } from "@/components/admin/SeoEditor";

const empty = {
  title: "", slug: "", excerpt: "", content: "",
  category: "", read_time: "", cover_image: "",
  is_published: true,
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function BlogForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories").select("name, slug").eq("type", "blog").order("sort_order");
      setCategories(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (data) setF(data);
    })();
  }, [id, isEdit]);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set("cover_image", data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const payload: any = {
        title: f.title,
        slug: f.slug || slugify(f.title),
        excerpt: f.excerpt,
        content: f.content,
        category: f.category,
        read_time: f.read_time,
        cover_image: f.cover_image,
        is_published: f.is_published,
      };
      const res = isEdit
        ? await supabase.from("blog_posts").update(payload).eq("id", id!)
        : await supabase.from("blog_posts").insert(payload);
      if (res.error) throw res.error;
      toast.success(isEdit ? "Post updated" : "Post created");
      nav("/admin/blog");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">{isEdit ? "Edit post" : "Create post"}</h1>

      <div className="grid gap-4 rounded-lg border bg-background p-6">
        <Field label="Title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Slug"><Input value={f.slug} placeholder="auto from title" onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Excerpt"><Textarea rows={2} value={f.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Input list="blog-categories" placeholder="Nutrition / Supplements / …" value={f.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            <datalist id="blog-categories">
              {categories.map((c) => <option key={c.slug} value={c.name} />)}
            </datalist>
          </Field>
          <Field label="Read time"><Input placeholder="5 min" value={f.read_time ?? ""} onChange={(e) => set("read_time", e.target.value)} /></Field>
        </div>

        <Field label="Cover image">
          <div className="space-y-3">
            {f.cover_image ? (
              <img src={f.cover_image} alt="" className="h-40 w-full rounded-md object-cover" />
            ) : (
              <div className="rounded-md border border-dashed border-amber-500/50 bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30">
                ⚠️ No cover image. The home and blog cards will show an emoji placeholder. Upload one for a polished look.
              </div>
            )}
            <div className="flex gap-2">
              <Input value={f.cover_image ?? ""} placeholder="Image URL or upload" onChange={(e) => set("cover_image", e.target.value)} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); }}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload
              </Button>
            </div>
          </div>
        </Field>

        <Field label="Content (Markdown supported)"><Textarea rows={14} value={f.content ?? ""} onChange={(e) => set("content", e.target.value)} /></Field>

        <div className="flex items-center gap-3">
          <Switch checked={f.is_published} onCheckedChange={(v) => set("is_published", v)} />
          <Label>Published</Label>
        </div>

        <SeoEditor
          entityType="blog"
          entityId={isEdit ? (id ?? null) : null}
          fallbackTitle={f.title}
          fallbackDescription={f.excerpt ?? ""}
          fallbackSlug={f.slug}
          images={f.cover_image ? [f.cover_image] : []}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => nav("/admin/blog")}>Cancel</Button>
          <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save post"}</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
