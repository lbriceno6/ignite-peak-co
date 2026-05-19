import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";

type FooterLink = {
  id: string;
  column_index: number;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
};

const TEXT_KEYS = [
  "footer_description",
  "footer_newsletter_title",
  "footer_newsletter_help",
  "footer_col1_title",
  "footer_col2_title",
  "footer_col3_title",
  "footer_copyright",
  "footer_social_instagram",
  "footer_social_youtube",
  "footer_social_facebook",
  "footer_social_whatsapp",
  "footer_social_email",
  "footer_payment_badges",
] as const;

const sb: any = supabase;

export default function AdminFooter() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, l] = await Promise.all([
      sb.from("site_content").select("key,value").in("key", TEXT_KEYS as unknown as string[]),
      sb.from("footer_links").select("*").order("column_index").order("sort_order"),
    ]);
    const m: Record<string, string> = {};
    TEXT_KEYS.forEach((k) => (m[k] = ""));
    (c.data ?? []).forEach((r: any) => { m[r.key] = r.value ?? ""; });
    setContent(m); setSaved(m);
    setLinks((l.data as FooterLink[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setContent((p) => ({ ...p, [k]: v }));
  const dirty = TEXT_KEYS.some((k) => (content[k] ?? "") !== (saved[k] ?? ""));

  const saveContent = async () => {
    setSaving(true);
    try {
      const rows = TEXT_KEYS.map((k) => ({ key: k, value: content[k] ?? "" }));
      const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Footer content saved");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const createLink = async (column_index: number) => {
    const colLinks = links.filter((l) => l.column_index === column_index);
    const sort_order = colLinks.length ? Math.max(...colLinks.map((l) => l.sort_order)) + 1 : 0;
    const { error } = await sb.from("footer_links").insert({ column_index, label: "New link", href: "/", sort_order });
    if (error) return toast.error(error.message);
    toast.success("Link created"); load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const col = links.filter((l) => l.column_index === link.column_index);
    const idx = col.findIndex((l) => l.id === id);
    const swap = col[idx + dir];
    if (!swap) return;
    await Promise.all([
      sb.from("footer_links").update({ sort_order: swap.sort_order }).eq("id", link.id),
      sb.from("footer_links").update({ sort_order: link.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const columns = [
    { idx: 1, key: "footer_col1_title" },
    { idx: 2, key: "footer_col2_title" },
    { idx: 3, key: "footer_col3_title" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Footer</h1>
        <p className="text-muted-foreground">Edit footer text, newsletter, social links, link columns and payment badges.</p>
      </div>

      {/* Text & socials */}
      <section className="rounded-lg border bg-background p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Texts & social links</h2>
            <p className="text-sm text-muted-foreground">Use full URLs (https://… or mailto:… or https://wa.me/…).</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setContent(saved)} disabled={!dirty || saving}>Discard</Button>
            <Button variant="dark" onClick={saveContent} disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </header>
        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="text-xs">Brand description</Label>
              <Textarea rows={3} value={content.footer_description} onChange={(e) => set("footer_description", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Newsletter title</Label>
              <Input value={content.footer_newsletter_title} onChange={(e) => set("footer_newsletter_title", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Newsletter help text</Label>
              <Input value={content.footer_newsletter_help} onChange={(e) => set("footer_newsletter_help", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Instagram URL</Label>
              <Input value={content.footer_social_instagram} onChange={(e) => set("footer_social_instagram", e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            <div>
              <Label className="text-xs">YouTube URL</Label>
              <Input value={content.footer_social_youtube} onChange={(e) => set("footer_social_youtube", e.target.value)} placeholder="https://youtube.com/…" />
            </div>
            <div>
              <Label className="text-xs">Facebook URL</Label>
              <Input value={content.footer_social_facebook} onChange={(e) => set("footer_social_facebook", e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp URL</Label>
              <Input value={content.footer_social_whatsapp} onChange={(e) => set("footer_social_whatsapp", e.target.value)} placeholder="https://wa.me/…" />
            </div>
            <div>
              <Label className="text-xs">Email (mailto)</Label>
              <Input value={content.footer_social_email} onChange={(e) => set("footer_social_email", e.target.value)} placeholder="mailto:hello@…" />
            </div>
            <div>
              <Label className="text-xs">Copyright (use {"{year}"} for current year)</Label>
              <Input value={content.footer_copyright} onChange={(e) => set("footer_copyright", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Payment badges (comma separated)</Label>
              <Input value={content.footer_payment_badges} onChange={(e) => set("footer_payment_badges", e.target.value)} placeholder="VISA,MASTERCARD,…" />
              <p className="mt-1 text-xs text-muted-foreground">Leave empty to hide badges row.</p>
            </div>
          </div>
        )}
      </section>

      {/* Link columns */}
      {columns.map((col) => (
        <section key={col.idx} className="rounded-lg border bg-background p-6">
          <header className="mb-4 flex items-end justify-between gap-4">
            <div className="flex-1">
              <Label className="text-xs">Column {col.idx} title</Label>
              <Input value={content[col.key] ?? ""} onChange={(e) => set(col.key, e.target.value)} className="max-w-xs" />
            </div>
            <Button variant="dark" onClick={() => createLink(col.idx)}><Plus size={16} /> New link</Button>
          </header>

          <div className="space-y-3">
            {links.filter((l) => l.column_index === col.idx).map((row, i, arr) => (
              <LinkRow
                key={row.id}
                row={row}
                isFirst={i === 0}
                isLast={i === arr.length - 1}
                onChanged={load}
                onMoveUp={() => move(row.id, -1)}
                onMoveDown={() => move(row.id, 1)}
              />
            ))}
            {links.filter((l) => l.column_index === col.idx).length === 0 && (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function LinkRow({
  row, isFirst, isLast, onChanged, onMoveUp, onMoveDown,
}: {
  row: FooterLink; isFirst: boolean; isLast: boolean;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setF(row); }, [row]);
  const set = (k: keyof FooterLink, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(row);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await sb.from("footer_links").update({
        label: f.label, href: f.href, is_active: f.is_active, open_in_new_tab: f.open_in_new_tab,
      }).eq("id", row.id);
      if (error) throw error;
      toast.success("Link saved");
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this link?")) return;
    const { error } = await sb.from("footer_links").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); onChanged();
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
        <Button variant="dark" size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
