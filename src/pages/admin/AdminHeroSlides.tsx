import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, ArrowUp, ArrowDown, Plus, Image as ImageIcon } from "lucide-react";

type Slide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  primary_label: string | null;
  primary_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty = {
  eyebrow: "",
  title: "",
  subtitle: "",
  image_url: "",
  primary_label: "",
  primary_href: "",
  secondary_label: "",
  secondary_href: "",
  is_active: true,
};

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order").order("created_at");
    setSlides((data as Slide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const sort_order = slides.length ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
    const { error } = await supabase.from("hero_slides").insert({ ...empty, title: "New slide", sort_order });
    if (error) return toast.error(error.message);
    toast.success("Slide created");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const swap = slides[idx + dir];
    if (!swap) return;
    const cur = slides[idx];
    await Promise.all([
      supabase.from("hero_slides").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("hero_slides").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Home banner carousel</h1>
          <p className="text-muted-foreground">Manage the slides shown at the top of the home page.</p>
        </div>
        <Button variant="dark" onClick={create}><Plus size={16} /> New slide</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : slides.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
          No slides yet. Click <strong>New slide</strong> to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((s, i) => (
            <SlideEditor
              key={s.id}
              slide={s}
              isFirst={i === 0}
              isLast={i === slides.length - 1}
              onChanged={load}
              onMoveUp={() => move(s.id, -1)}
              onMoveDown={() => move(s.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideEditor({
  slide,
  isFirst,
  isLast,
  onChanged,
  onMoveUp,
  onMoveDown,
}: {
  slide: Slide;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [f, setF] = useState<Slide>(slide);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setF(slide); }, [slide]);

  const set = (k: keyof Slide, v: any) => setF((p) => ({ ...p, [k]: v }));

  const dirty = JSON.stringify(f) !== JSON.stringify(slide);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hero_slides")
        .update({
          eyebrow: f.eyebrow,
          title: f.title,
          subtitle: f.subtitle,
          image_url: f.image_url,
          primary_label: f.primary_label,
          primary_href: f.primary_href,
          secondary_label: f.secondary_label,
          secondary_href: f.secondary_href,
          is_active: f.is_active,
        })
        .eq("id", slide.id);
      if (error) throw error;
      toast.success("Slide saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", slide.id);
    if (error) return toast.error(error.message);
    toast.success("Slide deleted");
    onChanged();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide">
            Slide #{slide.sort_order + 1}
          </span>
          <div className="flex items-center gap-2">
            <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} id={`active-${slide.id}`} />
            <Label htmlFor={`active-${slide.id}`} className="text-xs">Active</Label>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move up">
            <ArrowUp size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move down">
            <ArrowDown size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete">
            <Trash2 size={16} className="text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[260px,1fr]">
        {/* Image */}
        <div className="space-y-2">
          <Label className="text-xs">Background image</Label>
          <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
            {f.image_url ? (
              <img src={f.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <ImageIcon size={28} />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {f.image_url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("image_url", "")}>
                Remove
              </Button>
            )}
          </div>
          <Input value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="…or paste URL" />
        </div>

        {/* Text + buttons */}
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Eyebrow (small label above title)</Label>
            <Input value={f.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Textarea rows={2} value={f.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Textarea rows={2} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary button</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Label (e.g. Shop now)" value={f.primary_label ?? ""} onChange={(e) => set("primary_label", e.target.value)} />
              <Input placeholder="URL (e.g. /category/protein)" value={f.primary_href ?? ""} onChange={(e) => set("primary_href", e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secondary button</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Label (optional)" value={f.secondary_label ?? ""} onChange={(e) => set("secondary_label", e.target.value)} />
              <Input placeholder="URL (optional)" value={f.secondary_href ?? ""} onChange={(e) => set("secondary_href", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setF(slide)} disabled={!dirty || saving}>Discard</Button>
            <Button variant="dark" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save slide"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
