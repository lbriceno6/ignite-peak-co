import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";

const KEYS = [
  "about_eyebrow",
  "about_title_line1",
  "about_title_line2",
  "about_title_line3",
  "about_hero_image",
  "about_story_title",
  "about_story_p1",
  "about_story_p2",
  "about_stat1_n","about_stat1_l",
  "about_stat2_n","about_stat2_l",
  "about_stat3_n","about_stat3_l",
  "about_stat4_n","about_stat4_l",
  "about_principles_title",
  "about_principle1_t","about_principle1_d",
  "about_principle2_t","about_principle2_d",
  "about_principle3_t","about_principle3_d",
  "about_principle4_t","about_principle4_d",
  "about_cta_title","about_cta_label","about_cta_href",
] as const;

const sb: any = supabase;

export default function AdminAbout() {
  const [m, setM] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await sb.from("site_content").select("key,value").in("key", KEYS as unknown as string[]);
    const next: Record<string, string> = {};
    KEYS.forEach((k) => (next[k] = ""));
    (data ?? []).forEach((r: any) => { next[r.key] = r.value ?? ""; });
    setM(next); setSaved(next);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setM((p) => ({ ...p, [k]: v }));
  const dirty = KEYS.some((k) => (m[k] ?? "") !== (saved[k] ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({ key: k, value: m[k] ?? "" }));
      const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("About page saved");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `about-hero-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set("about_hero_image", data.publicUrl);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const F = ({ k, label, area }: { k: string; label: string; area?: boolean }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      {area ? (
        <Textarea className="mt-1.5" rows={4} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <Input className="mt-1.5" value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Hero</h2>
        <F k="about_eyebrow" label="Eyebrow" />
        <div className="grid gap-4 sm:grid-cols-3">
          <F k="about_title_line1" label="Title line 1" />
          <F k="about_title_line2" label="Accent line" />
          <F k="about_title_line3" label="Title line 3" />
        </div>
        <div>
          <Label className="text-xs">Hero image</Label>
          <div className="mt-1.5 relative aspect-[16/6] overflow-hidden rounded-md border bg-muted">
            {m.about_hero_image ? (
              <img src={m.about_hero_image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon size={28} /></div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {m.about_hero_image && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("about_hero_image", "")}>Remove</Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Our story</h2>
        <F k="about_story_title" label="Title" />
        <F k="about_story_p1" label="Paragraph 1" area />
        <F k="about_story_p2" label="Paragraph 2" area />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <F k={`about_stat${i}_n`} label={`Stat ${i} value`} />
              <F k={`about_stat${i}_l`} label={`Stat ${i} label`} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Principles</h2>
        <F k="about_principles_title" label="Section title" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <F k={`about_principle${i}_t`} label={`Principle ${i} title`} />
              <F k={`about_principle${i}_d`} label="Description" area />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">CTA</h2>
        <F k="about_cta_title" label="Title" />
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="about_cta_label" label="Button label" />
          <F k="about_cta_href" label="Button link" />
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={!dirty || saving} size="lg">{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
