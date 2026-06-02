import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, ArrowUp, ArrowDown, Image as ImageIcon, Eye, EyeOff, Copy } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Block = {
  id: string;
  block_key: string;
  block_type: string;
  sort_order: number;
  is_active: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  cta2_label: string | null;
  cta2_href: string | null;
  image_url: string | null;
};

const TYPE_LABELS: Record<string, { name: string; desc: string; hasImage: boolean; hasCta: boolean; hasCta2: boolean }> = {
  hero:          { name: "Hero carousel",       desc: "Slides edited from the “Hero carousel” page.", hasImage: false, hasCta: false, hasCta2: false },
  categories:    { name: "Categories grid",     desc: "Auto-populated from your categories.",         hasImage: false, hasCta: false, hasCta2: false },
  best_sellers:  { name: "Best sellers",        desc: "Products tagged as “best seller”.",            hasImage: false, hasCta: true,  hasCta2: false },
  goals:         { name: "Shop by goal",        desc: "Goal cards.",                                  hasImage: false, hasCta: false, hasCta2: false },
  promo:         { name: "Promo banner",        desc: "Big promo banner with image and CTA.",         hasImage: true,  hasCta: true,  hasCta2: false },
  products_grid: { name: "More products grid",  desc: "Grid of latest products.",                     hasImage: false, hasCta: false, hasCta2: false },
  reviews:       { name: "Customer reviews",    desc: "Reviews carousel.",                            hasImage: false, hasCta: false, hasCta2: false },
  blog:          { name: "Guides & insights",   desc: "Featured blog posts.",                         hasImage: false, hasCta: false, hasCta2: false },
  trust:         { name: "Trust badges",        desc: "Shipping / payment / quality badges.",         hasImage: false, hasCta: false, hasCta2: false },
  nutrition_advisory: { name: "Nutritional advisory", desc: "Section with image and WhatsApp CTA for nutritional advice.", hasImage: true, hasCta: true, hasCta2: false },
};

export default function AdminHomeBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("home_blocks").select("*").order("sort_order").order("created_at");
    setBlocks((data as Block[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((s) => s.id === id);
    const swap = blocks[idx + dir];
    if (!swap) return;
    const cur = blocks[idx];
    await Promise.all([
      supabase.from("home_blocks").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("home_blocks").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const duplicate = async (b: Block) => {
    try {
      const suffix = Math.random().toString(36).slice(2, 7);
      const newKey = `${b.block_key}-copy-${suffix}`.slice(0, 80);
      const maxOrder = blocks.reduce((m, x) => Math.max(m, x.sort_order), 0);
      const { error } = await supabase.from("home_blocks").insert({
        block_key: newKey,
        block_type: b.block_type,
        sort_order: maxOrder + 1,
        is_active: false,
        eyebrow: b.eyebrow,
        title: b.title ? `Copia de ${b.title}` : `Copia de ${b.block_key}`,
        subtitle: b.subtitle,
        cta_label: b.cta_label,
        cta_href: b.cta_href,
        cta2_label: b.cta2_label,
        cta2_href: b.cta2_href,
        image_url: b.image_url,
      });
      if (error) throw error;
      toast.success("Sección duplicada correctamente (oculta).");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Home page sections</h1>
        <p className="text-muted-foreground">
          Reorder, hide/show and edit every section of the home page. Hero slides and Guides texts also have
          dedicated pages with extra options.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              isFirst={i === 0}
              isLast={i === blocks.length - 1}
              position={i + 1}
              onChanged={load}
              onMoveUp={() => move(b.id, -1)}
              onMoveDown={() => move(b.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  block, isFirst, isLast, position, onChanged, onMoveUp, onMoveDown,
}: {
  block: Block; isFirst: boolean; isLast: boolean; position: number;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState<Block>(block);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setF(block); }, [block]);

  const meta = TYPE_LABELS[block.block_type] ?? { name: block.block_key, desc: "", hasImage: true, hasCta: true, hasCta2: true };
  const set = (k: keyof Block, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(block);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("home_blocks").update({
        is_active: f.is_active,
        eyebrow: f.eyebrow, title: f.title, subtitle: f.subtitle,
        cta_label: f.cta_label, cta_href: f.cta_href,
        cta2_label: f.cta2_label, cta2_href: f.cta2_href,
        image_url: f.image_url,
      }).eq("id", block.id);
      if (error) throw error;
      toast.success("Section saved");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (v: boolean) => {
    set("is_active", v);
    const { error } = await supabase.from("home_blocks").update({ is_active: v }).eq("id", block.id);
    if (error) toast.error(error.message);
    else toast.success(v ? "Section shown" : "Section hidden");
    onChanged();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `home-${block.block_key}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className={`rounded-lg border bg-background p-5 ${!f.is_active ? "opacity-60" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">#{position}</span>
          <div>
            <p className="font-display text-lg leading-tight">{meta.name}</p>
            <p className="text-xs text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex items-center gap-2">
            {f.is_active ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
            <Switch checked={f.is_active} onCheckedChange={toggleActive} />
          </div>
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move up">
            <ArrowUp size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move down">
            <ArrowDown size={16} />
          </Button>
        </div>
      </div>

      <div className={`grid gap-5 ${meta.hasImage ? "md:grid-cols-[260px,1fr]" : ""}`}>
        {meta.hasImage && (
          <div className="space-y-2">
            <Label className="text-xs">Background image</Label>
            <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
              {f.image_url ? (
                <img src={f.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon size={28} /></div>
              )}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              {f.image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("image_url", "")}>Remove</Button>
              )}
            </div>
            <Input value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="…or paste URL" />
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Eyebrow (small label)</Label>
              <Input value={f.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Subtitle / description</Label>
            <Textarea rows={2} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>

          {meta.hasCta && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Button</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Label" value={f.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
                <Input placeholder="URL (e.g. /category/protein)" value={f.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} />
              </div>
            </div>
          )}

          {meta.hasCta2 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secondary button</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Label" value={f.cta2_label ?? ""} onChange={(e) => set("cta2_label", e.target.value)} />
                <Input placeholder="URL" value={f.cta2_href ?? ""} onChange={(e) => set("cta2_href", e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setF(block)} disabled={!dirty || saving}>Discard</Button>
            <Button variant="dark" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save section"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
