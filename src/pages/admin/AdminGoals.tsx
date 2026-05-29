import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { slugify } from "@/lib/slug";

const sb: any = supabase;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Goal = {
  id: string;
  name: string;
  slug: string;
  title_seo: string | null;
  meta_description: string | null;
  image_url: string | null;
  short_description: string | null;
  long_description: string | null;
  canonical_url: string | null;
  is_active: boolean;
  show_in_home: boolean;
  show_in_menu: boolean;
  show_in_mega_menu: boolean;
  show_in_sitemap: boolean;
  sort_order: number;
  related_category_ids: string[];
  related_product_ids: string[];
};

const empty: Partial<Goal> = {
  name: "", slug: "", is_active: true,
  show_in_home: false, show_in_menu: true, show_in_mega_menu: true, show_in_sitemap: true,
  sort_order: 0, related_category_ids: [], related_product_ids: [],
};

export default function AdminGoals() {
  const [items, setItems] = useState<Goal[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [g, c, p] = await Promise.all([
      sb.from("goals").select("*").order("sort_order").order("name"),
      sb.from("categories").select("id,name").eq("type", "product").eq("is_active", true).order("name"),
      sb.from("products").select("id,name").eq("is_active", true).order("name").limit(500),
    ]);
    setItems((g.data as Goal[]) ?? []);
    setCats((c.data as any[]) ?? []);
    setProducts((p.data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error("Nombre obligatorio");
    const newSlug = (editing.slug || slugify(editing.name)).trim();
    if (!SLUG_RE.test(newSlug)) return toast.error("Slug inválido");
    const { data: dup } = await sb.from("goals").select("id").eq("slug", newSlug);
    if ((dup ?? []).some((r: any) => r.id !== editing.id)) return toast.error("Ya existe un objetivo con este slug");

    const prev = editing.id ? items.find((x) => x.id === editing.id) : null;
    const slugChanged = !!prev && prev.slug !== newSlug;
    if (slugChanged) {
      const ok = confirm("Cambiar el slug modificará la URL del objetivo. Se creará una redirección 301 automática.\n\n¿Continuar?");
      if (!ok) return;
    }

    setSaving(true);
    const payload = {
      name: editing.name!.trim(),
      slug: newSlug,
      title_seo: editing.title_seo || null,
      meta_description: editing.meta_description || null,
      image_url: editing.image_url || null,
      short_description: editing.short_description || null,
      long_description: editing.long_description || null,
      canonical_url: editing.canonical_url || null,
      is_active: editing.is_active ?? true,
      show_in_home: editing.show_in_home ?? false,
      show_in_menu: editing.show_in_menu ?? true,
      show_in_mega_menu: editing.show_in_mega_menu ?? true,
      show_in_sitemap: editing.show_in_sitemap ?? true,
      sort_order: Number(editing.sort_order) || 0,
      related_category_ids: editing.related_category_ids ?? [],
      related_product_ids: editing.related_product_ids ?? [],
    };
    const res = editing.id
      ? await sb.from("goals").update(payload).eq("id", editing.id)
      : await sb.from("goals").insert(payload);
    if (res.error) { setSaving(false); return toast.error(res.error.message); }

    if (slugChanged && prev) {
      await sb.from("seo_redirects").upsert([{
        from_path: `/objetivo/${prev.slug}`, to_path: `/objetivo/${newSlug}`,
        status_code: 301, active: true,
      }], { onConflict: "from_path" });
    }

    setSaving(false);
    setEditing(null);
    toast.success("Objetivo guardado");
    load();
  };

  const remove = async (g: Goal) => {
    if (!confirm(`Eliminar "${g.name}"?`)) return;
    const { error } = await sb.from("goals").delete().eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    load();
  };

  const toggleArr = (key: "related_category_ids" | "related_product_ids", id: string) => {
    setEditing((p) => {
      if (!p) return p;
      const arr = new Set(p[key] ?? []);
      arr.has(id) ? arr.delete(id) : arr.add(id);
      return { ...p, [key]: Array.from(arr) };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Objetivos (compra por necesidad)</h1>
          <p className="text-sm text-muted-foreground">Cada objetivo se publica en /objetivo/[slug].</p>
        </div>
        <Button variant="dark" onClick={() => setEditing(empty)}><Plus size={14} /> Nuevo objetivo</Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Nombre</th><th className="p-3">Slug</th>
                <th className="p-3">Productos rel.</th><th className="p-3">Categorías rel.</th>
                <th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.id} className="border-b last:border-b-0">
                  <td className="p-3 font-medium">{g.name}</td>
                  <td className="p-3 text-muted-foreground">{g.slug}</td>
                  <td className="p-3 text-xs">{g.related_product_ids?.length ?? 0}</td>
                  <td className="p-3 text-xs">{g.related_category_ids?.length ?? 0}</td>
                  <td className="p-3 text-xs">{g.is_active ? "Activo" : "Inactivo"}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(g)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(g)}><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sin objetivos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} objetivo</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing((p) => ({
                    ...p!, name: e.target.value,
                    slug: p!.id ? p!.slug : slugify(e.target.value),
                  }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug SEO</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, slug: e.target.value }))} />
                  {editing.slug && <p className="text-xs text-muted-foreground">URL: <code>/objetivo/{editing.slug}</code></p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descripción corta</Label>
                <Textarea rows={2} value={editing.short_description ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, short_description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción larga SEO</Label>
                <Textarea rows={4} value={editing.long_description ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, long_description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Meta título</Label>
                  <Input value={editing.title_seo ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, title_seo: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>URL canónica</Label>
                  <Input value={editing.canonical_url ?? ""} placeholder="https://..." onChange={(e) => setEditing((p) => ({ ...p!, canonical_url: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Meta descripción</Label>
                <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, meta_description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Imagen (URL)</Label>
                <Input value={editing.image_url ?? ""} onChange={(e) => setEditing((p) => ({ ...p!, image_url: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categorías relacionadas</Label>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
                    {cats.map((c) => {
                      const on = (editing.related_category_ids ?? []).includes(c.id);
                      return (
                        <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                          <input type="checkbox" checked={on} onChange={() => toggleArr("related_category_ids", c.id)} />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Productos relacionados</Label>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
                    {products.map((c) => {
                      const on = (editing.related_product_ids ?? []).includes(c.id);
                      return (
                        <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                          <input type="checkbox" checked={on} onChange={() => toggleArr("related_product_ids", c.id)} />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p!, is_active: v }))} /> Activo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.show_in_home ?? false} onCheckedChange={(v) => setEditing((p) => ({ ...p!, show_in_home: v }))} /> Home
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.show_in_menu ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p!, show_in_menu: v }))} /> Menú
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.show_in_mega_menu ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p!, show_in_mega_menu: v }))} /> Mega menú
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editing.show_in_sitemap ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p!, show_in_sitemap: v }))} /> Sitemap
                </label>
                <div className="space-y-1">
                  <Label className="text-xs">Orden</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, sort_order: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
