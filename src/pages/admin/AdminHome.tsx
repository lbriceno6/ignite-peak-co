import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, DEFAULT_CURRENCY_KEY, type CurrencyCode } from "@/context/CurrencyContext";
import { toast } from "sonner";

type Field = { key: string; label: string; help?: string; multiline?: boolean };

const GUIDES_FIELDS: Field[] = [
  { key: "home.guides.eyebrow", label: "Eyebrow (small label above title)", help: "Ej: Knowledge" },
  { key: "home.guides.title", label: "Section title", help: "Ej: Guides & Insights" },
  { key: "home.guides.subtitle", label: "Subtitle (optional)", multiline: true },
  { key: "home.guides.cta_label", label: "Link label", help: "Ej: All articles" },
  { key: "home.guides.cta_href", label: "Link URL", help: "Ej: /blog" },
];

type PreviewPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  cover_image: string | null;
};

export default function AdminHome() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<PreviewPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [contentRes, featuredRes, recentRes] = await Promise.all([
      supabase.from("site_content").select("key,value"),
      supabase
        .from("blog_posts")
        .select("id,slug,title,excerpt,category,read_time,cover_image,published_at")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("featured_order", { ascending: true, nullsFirst: false })
        .order("published_at", { ascending: false })
        .limit(3),
      supabase
        .from("blog_posts")
        .select("id,slug,title,excerpt,category,read_time,cover_image,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3),
    ]);
    const m: Record<string, string> = {};
    (contentRes.data ?? []).forEach((r: any) => { m[r.key] = r.value ?? ""; });
    setValues(m);
    setSavedValues(m);
    const f = (featuredRes.data as PreviewPost[]) ?? [];
    const r = (recentRes.data as PreviewPost[]) ?? [];
    const ids = new Set(f.map((x) => x.id));
    setPosts([...f, ...r.filter((x) => !ids.has(x.id))].slice(0, 3));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const dirty = GUIDES_FIELDS.some((f) => (values[f.key] ?? "") !== (savedValues[f.key] ?? ""));

  const saveAll = async (fields: Field[]) => {
    setSaving(true);
    try {
      const rows = fields.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Saved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const v = (k: string) => values[k] ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Home content</h1>
        <p className="text-muted-foreground">Edit the texts that appear on the home page.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <section className="rounded-lg border bg-background p-6">
          <header className="mb-4">
            <h2 className="font-display text-xl">Guides &amp; insights section</h2>
            <p className="text-sm text-muted-foreground">Appears near the bottom of the home page.</p>
          </header>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4">
              {GUIDES_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  {f.multiline ? (
                    <Textarea rows={2} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  ) : (
                    <Input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                  {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {dirty ? "Unsaved changes (live in preview)" : "All changes saved"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setValues(savedValues)} disabled={!dirty || saving}>
                    Discard
                  </Button>
                  <Button variant="dark" onClick={() => saveAll(GUIDES_FIELDS)} disabled={saving || !dirty}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> to choose <em>which</em> 3 articles appear in this
            section and in which order, go to <a className="underline" href="/admin/blog">Blog posts</a> and toggle
            “Featured on home” on the posts you want.
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-lg border bg-background p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">Live preview</h2>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">As shown on home</span>
          </header>

          <div className="overflow-hidden rounded-md border bg-background">
            <div className="px-6 py-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {v("home.guides.eyebrow") || "—"}
                  </span>
                  <h3 className="mt-1 font-display text-2xl uppercase">
                    {v("home.guides.title") || "Untitled section"}
                  </h3>
                  {v("home.guides.subtitle") && (
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">{v("home.guides.subtitle")}</p>
                  )}
                </div>
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-foreground sm:inline-flex sm:items-center sm:gap-1">
                  {v("home.guides.cta_label") || "—"} <ArrowRight size={12} />
                </span>
              </div>

              {posts.length === 0 ? (
                <p className="mt-6 rounded border border-dashed p-4 text-sm text-muted-foreground">
                  No published posts yet. Create some in <a className="underline" href="/admin/blog">Blog posts</a>.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {posts.map((post) => (
                    <div key={post.id} className="flex flex-col gap-2">
                      <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
                        {post.cover_image ? (
                          <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-4xl opacity-30">📝</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {post.category && <span className="font-bold text-accent">{post.category}</span>}
                        {post.read_time && <span>· {post.read_time} read</span>}
                      </div>
                      <h4 className="font-display text-sm leading-tight">{post.title}</h4>
                      {post.excerpt && <p className="line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Preview reflects your unsaved text edits. Featured articles and order come from the database in real time.
          </p>
        </section>
      </div>
    </div>
  );
}
