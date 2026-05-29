import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Pencil, Save } from "lucide-react";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  type: string;
  updated_at: string;
};

const sb: any = supabase;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function CategoriesLinksTable() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [redirCount, setRedirCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState<{ name: string; slug: string; is_active: boolean }>({
    name: "",
    slug: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    setLoading(true);
    const [c, r] = await Promise.all([
      sb.from("categories").select("id,name,slug,parent_id,is_active,type,updated_at").eq("type", "product").order("sort_order").order("name"),
      sb.from("seo_redirects").select("to_path").eq("active", true),
    ]);
    setCats((c.data as Cat[]) ?? []);
    const map: Record<string, number> = {};
    ((r.data as any[]) ?? []).forEach((row) => {
      const k = row.to_path as string;
      map[k] = (map[k] ?? 0) + 1;
    });
    setRedirCount(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const byId = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const openEdit = (c: Cat) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, is_active: c.is_active });
  };

  const save = async () => {
    if (!editing) return;
    if (!form.name.trim()) return toast.error("El nombre visible es obligatorio");
    if (!SLUG_RE.test(form.slug.trim())) {
      return toast.error("Slug inválido. Solo minúsculas, números y guiones medios.");
    }
    // duplicado
    const { data: dup } = await sb.from("categories").select("id").eq("slug", form.slug.trim()).eq("type", "product");
    if ((dup ?? []).some((r: any) => r.id !== editing.id)) {
      return toast.error("Ya existe otra categoría con este slug.");
    }

    const slugChanged = editing.slug !== form.slug.trim();
    if (slugChanged) {
      const ok = confirm(
        "Cambiar el slug modificará la URL de esta categoría. Se creará una redirección 301 automática para proteger el SEO.\n\n¿Continuar?",
      );
      if (!ok) return;
    }

    setSaving(true);
    const { error } = await sb.from("categories").update({
      name: form.name.trim(),
      slug: form.slug.trim(),
      is_active: form.is_active,
    }).eq("id", editing.id);

    if (error) { setSaving(false); return toast.error(error.message); }

    if (slugChanged) {
      const from_path = `/categoria/${editing.slug}`;
      const to_path = `/categoria/${form.slug.trim()}`;
      const { error: rErr } = await sb.from("seo_redirects").upsert(
        { from_path, to_path, status_code: 301, active: true },
        { onConflict: "from_path" },
      );
      if (rErr) toast.error(`Categoría guardada, pero la redirección falló: ${rErr.message}`);
      else toast.success(`Redirección 301 creada: ${from_path} → ${to_path}`);
    }
    setSaving(false);
    setEditing(null);
    toast.success("Categoría actualizada");
    load();
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch { toast.error("No se pudo copiar"); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categorías · gestión de URL y SEO</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cambia el nombre visible sin afectar la URL. Si cambias el slug se crea una redirección 301 automática.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Nombre visible</th>
                  <th className="py-2 pr-3">Slug SEO</th>
                  <th className="py-2 pr-3">URL completa</th>
                  <th className="py-2 pr-3">URL canónica</th>
                  <th className="py-2 pr-3">Padre</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Redirecciones</th>
                  <th className="py-2 pr-3">Modificada</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => {
                  const path = `/categoria/${c.slug}`;
                  const full = `${origin}${path}`;
                  const rcount = redirCount[path] ?? 0;
                  return (
                    <tr key={c.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.slug}</td>
                      <td className="py-2 pr-3"><code className="text-xs">{path}</code></td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-[220px]">{full}</td>
                      <td className="py-2 pr-3 text-xs">{c.parent_id ? byId[c.parent_id]?.name ?? "—" : "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                          {c.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{rcount}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => copy(full)} title="Copiar URL">
                            <Copy size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Probar enlace">
                            <a href={path} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {cats.length === 0 && (
                  <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Sin categorías.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre visible de categoría</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Cambiarlo no afecta la URL ni el SEO.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Slug SEO</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
              <p className="text-xs text-muted-foreground">
                Solo minúsculas, números y guiones medios. Sin tildes, ñ ni espacios.
              </p>
              {editing && editing.slug !== form.slug && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                  Cambiar el slug modificará la URL de esta categoría. Se creará una redirección 301 automática para proteger el SEO.
                </div>
              )}
              {form.slug && <p className="text-xs text-muted-foreground">URL: <code>/categoria/{form.slug}</code></p>}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
              <Label className="text-sm">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span className="ml-1">Guardar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
