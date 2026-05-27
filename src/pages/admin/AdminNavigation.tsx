import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, ArrowUp, ArrowDown, Plus, Image as ImageIcon } from "lucide-react";

type NavLinkRow = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
};

const LOGO_KEYS = ["logo_text", "logo_accent", "logo_image_url", "favicon_url"] as const;
const MENU_KEYS = ["nav_menu_max_categories", "nav_menu_font_family", "nav_menu_text_color", "nav_menu_bg_color"] as const;
const FONT_OPTIONS = [
  "", "Inter", "Poppins", "Montserrat", "Roboto", "Lato", "Oswald",
  "Bebas Neue", "Playfair Display", "Raleway", "Nunito", "system-ui", "serif", "sans-serif",
];

export default function AdminNavigation() {
  const [logo, setLogo] = useState<Record<string, string>>({ logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" });
  const [savedLogo, setSavedLogo] = useState<Record<string, string>>({ logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" });
  const [links, setLinks] = useState<NavLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLogo, setSavingLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [c, l] = await Promise.all([
      supabase.from("site_content").select("key,value").in("key", LOGO_KEYS as unknown as string[]),
      supabase.from("nav_links").select("*").order("sort_order").order("created_at"),
    ]);
    const m: Record<string, string> = { logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" };
    (c.data ?? []).forEach((r: any) => { m[r.key] = r.value ?? ""; });
    setLogo(m); setSavedLogo(m);
    setLinks((l.data as NavLinkRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setL = (k: string, v: string) => setLogo((p) => ({ ...p, [k]: v }));
  const logoDirty = LOGO_KEYS.some((k) => (logo[k] ?? "") !== (savedLogo[k] ?? ""));

  const saveLogo = async () => {
    setSavingLogo(true);
    try {
      const rows = LOGO_KEYS.map((k) => ({ key: k, value: logo[k] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Logo saved");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSavingLogo(false); }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      setL("logo_image_url", data.publicUrl);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const uploadFavicon = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `favicon-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      setL("favicon_url", data.publicUrl);
      toast.success("Favicon uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingFavicon(false); }
  };

  const createLink = async () => {
    const sort_order = links.length ? Math.max(...links.map((s) => s.sort_order)) + 1 : 0;
    const { error } = await supabase.from("nav_links").insert({ label: "New link", href: "/", sort_order });
    if (error) return toast.error(error.message);
    toast.success("Link created");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = links.findIndex((s) => s.id === id);
    const swap = links[idx + dir];
    if (!swap) return;
    const cur = links[idx];
    await Promise.all([
      supabase.from("nav_links").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("nav_links").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Logo & Menu</h1>
        <p className="text-muted-foreground">Customize the site logo and the top navigation links.</p>
      </div>

      {/* Logo */}
      <section className="rounded-lg border bg-background p-6">
        <header className="mb-4">
          <h2 className="font-display text-xl">Logo</h2>
          <p className="text-sm text-muted-foreground">
            Upload an image logo, or use a text logo with an accent color part.
          </p>
        </header>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-[260px,1fr]">
            <div className="space-y-5">
              {/* Logo image */}
              <div className="space-y-2">
                <Label className="text-xs">Image logo (optional)</Label>
                <div className="relative grid h-32 place-items-center overflow-hidden rounded-md border bg-muted">
                  {logo.logo_image_url ? (
                    <img src={logo.logo_image_url} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon size={28} className="text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                  {logo.logo_image_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setL("logo_image_url", "")}>
                      Remove
                    </Button>
                  )}
                </div>
                <Input value={logo.logo_image_url} onChange={(e) => setL("logo_image_url", e.target.value)} placeholder="…or paste URL" />
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <Label className="text-xs">Favicon</Label>
                <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-md border bg-muted">
                  {logo.favicon_url ? (
                    <img src={logo.favicon_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon size={20} className="text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={faviconRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFavicon(e.target.files[0])}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon}>
                    {uploadingFavicon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploadingFavicon ? "Uploading…" : "Upload"}
                  </Button>
                  {logo.favicon_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setL("favicon_url", "")}>
                      Remove
                    </Button>
                  )}
                </div>
                <Input value={logo.favicon_url} onChange={(e) => setL("favicon_url", e.target.value)} placeholder="…or paste URL" />
                <p className="text-xs text-muted-foreground">Shown in browser tab. Recommended: 32×32 or 64×64 PNG/ICO.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Logo text (main)</Label>
                <Input value={logo.logo_text} onChange={(e) => setL("logo_text", e.target.value)} placeholder="VOLT" />
                <p className="mt-1 text-xs text-muted-foreground">Shown only when no image is uploaded.</p>
              </div>
              <div>
                <Label className="text-xs">Logo text (accent / colored part)</Label>
                <Input value={logo.logo_accent} onChange={(e) => setL("logo_accent", e.target.value)} placeholder="RA" />
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
                {logo.logo_image_url ? (
                  <img src={logo.logo_image_url} alt="" className="h-10 object-contain" />
                ) : (
                  <span className="font-display text-3xl">
                    {logo.logo_text}<span className="text-accent">{logo.logo_accent}</span>
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLogo(savedLogo)} disabled={!logoDirty || savingLogo}>Discard</Button>
                <Button variant="dark" onClick={saveLogo} disabled={!logoDirty || savingLogo}>
                  {savingLogo ? "Saving…" : "Save logo"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Nav links */}
      <section className="rounded-lg border bg-background p-6">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Menu links</h2>
            <p className="text-sm text-muted-foreground">Links shown on the right of the top navigation (e.g. About, Guides, Contact).</p>
          </div>
          <Button variant="dark" onClick={createLink}><Plus size={16} /> New link</Button>
        </header>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : links.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
            No links yet. Click <strong>New link</strong> to add one.
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((row, i) => (
              <LinkRow
                key={row.id}
                row={row}
                isFirst={i === 0}
                isLast={i === links.length - 1}
                onChanged={load}
                onMoveUp={() => move(row.id, -1)}
                onMoveDown={() => move(row.id, 1)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LinkRow({
  row, isFirst, isLast, onChanged, onMoveUp, onMoveDown,
}: {
  row: NavLinkRow; isFirst: boolean; isLast: boolean;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setF(row); }, [row]);
  const set = (k: keyof NavLinkRow, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(row);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("nav_links").update({
        label: f.label, href: f.href, is_active: f.is_active, open_in_new_tab: f.open_in_new_tab,
      }).eq("id", row.id);
      if (error) throw error;
      toast.success("Link saved");
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("nav_links").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChanged();
  };

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="grid gap-3 md:grid-cols-[1fr,1.5fr,auto,auto]">
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={f.label} onChange={(e) => set("label", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">URL</Label>
          <Input value={f.href} onChange={(e) => set("href", e.target.value)} placeholder="/about or https://…" />
        </div>
        <div className="flex flex-col gap-2 pt-5">
          <div className="flex items-center gap-2">
            <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} id={`a-${row.id}`} />
            <Label htmlFor={`a-${row.id}`} className="text-xs">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={f.open_in_new_tab} onCheckedChange={(v) => set("open_in_new_tab", v)} id={`n-${row.id}`} />
            <Label htmlFor={`n-${row.id}`} className="text-xs">New tab</Label>
          </div>
        </div>
        <div className="flex items-start gap-1 pt-5">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst}><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast}><ArrowDown size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={remove}><Trash2 size={16} className="text-destructive" /></Button>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setF(row)} disabled={!dirty || saving}>Discard</Button>
        <Button variant="dark" size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
