import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { slugify } from "@/lib/slug";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "product" | "blog";
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_menu?: boolean;
  menu_column?: number;
  menu_group_title?: string | null;
  menu_badge?: string | null;
  menu_type?: "mega" | "link";
  featured_enabled?: boolean;
  featured_title?: string | null;
  featured_text?: string | null;
  featured_cta_label?: string | null;
  featured_cta_href?: string | null;
  featured_image_url?: string | null;
};

const empty: Partial<Category> = {
  name: "",
  slug: "",
  type: "product",
  parent_id: null,
  description: "",
  icon: "",
  image_url: "",
  meta_title: "",
  meta_description: "",
  sort_order: 0,
  is_active: true,
  show_in_menu: true,
  menu_column: 1,
  menu_group_title: "",
  menu_badge: "",
  menu_type: "mega",
  featured_enabled: false,
};

export default function AdminCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [tab, setTab] = useState<"product" | "blog">("product");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category>>(empty);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    const list = (data as Category[]) ?? [];
    setItems(list);
    // Expand all by default
    setExpanded((prev) => {
      const next = { ...prev };
      list.filter((c) => !c.parent_id).forEach((c) => {
        if (next[c.id] === undefined) next[c.id] = true;
      });
      return next;
    });
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) => c.type === tab);
  const mains = useMemo(
    () => filtered.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [filtered],
  );
  const subsByParent = useMemo(() => {
    const map: Record<string, Category[]> = {};
    filtered.filter((c) => c.parent_id).forEach((c) => {
      const k = c.parent_id as string;
      (map[k] ||= []).push(c);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [filtered]);

  const openNewMain = () => { setEditing({ ...empty, type: tab, parent_id: null }); setOpen(true); };
  const openNewSub = (parentId: string) => { setEditing({ ...empty, type: tab, parent_id: parentId }); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setOpen(true); };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("El nombre es obligatorio");
    const payload = {
      name: editing.name!.trim(),
      slug: (editing.slug || slugify(editing.name!)).trim(),
      type: (editing.type as "product" | "blog") ?? "product",
      parent_id: editing.parent_id || null,
      description: editing.description || null,
      icon: editing.icon || null,
      image_url: editing.image_url || null,
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      sort_order: Number(editing.sort_order) || 0,
      is_active: editing.is_active ?? true,
    };
    const res = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing.id ? "Categoría actualizada" : "Categoría creada");
    setOpen(false);
    load();
  };

  const toggleActive = async (c: Category) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (c: Category) => {
    const childCount = subsByParent[c.id]?.length || 0;
    const { count: productCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq(c.parent_id ? "subcategory" : "category", c.name);
    const extra = [
      childCount ? `${childCount} subcategorías` : null,
      productCount ? `${productCount} productos asociados` : null,
    ].filter(Boolean).join(" y ");
    const msg = extra
      ? `Esta categoría tiene ${extra}. ¿Eliminar de todos modos?`
      : `¿Eliminar "${c.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoría eliminada");
    load();
  };

  const moveSort = async (c: Category, dir: -1 | 1) => {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: Math.max(0, (c.sort_order || 0) + dir) })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const mainOptions = useMemo(
    () => items.filter((c) => c.type === (editing.type ?? "product") && !c.parent_id),
    [items, editing.type],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Categorías</h1>
          <p className="text-muted-foreground">
            {mains.length} categorías principales · {filtered.length - mains.length} subcategorías
          </p>
        </div>
        <Button variant="dark" onClick={openNewMain}><Plus size={16} /> Nueva categoría principal</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="product">
            Productos ({items.filter((i) => i.type === "product").length})
          </TabsTrigger>
          <TabsTrigger value="blog">
            Blog ({items.filter((i) => i.type === "blog").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="rounded-lg border bg-background">
            {mains.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <FolderTree className="mx-auto mb-2 opacity-40" />
                Aún no hay categorías. Crea la primera categoría principal.
              </div>
            )}

            {mains.map((m) => {
              const subs = subsByParent[m.id] || [];
              const isOpen = expanded[m.id] ?? true;
              return (
                <div key={m.id} className="border-b last:border-b-0">
                  {/* Main row */}
                  <div className={`flex items-center gap-2 p-3 ${!m.is_active ? "opacity-60" : ""}`}>
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [m.id]: !isOpen }))}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Expandir"
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {m.icon && <span className="text-lg">{m.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-xs text-muted-foreground">/{m.slug}</span>
                        {!m.is_active && <span className="text-xs text-destructive">Inactiva</span>}
                      </div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{subs.length} subs</span>
                    <span className="text-xs text-muted-foreground">#{m.sort_order}</span>
                    <Button variant="ghost" size="icon" onClick={() => moveSort(m, -1)} title="Subir">▲</Button>
                    <Button variant="ghost" size="icon" onClick={() => moveSort(m, 1)} title="Bajar">▼</Button>
                    <div className="flex items-center gap-2 px-1">
                      <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openNewSub(m.id)}>
                      <Plus size={14} /> Sub
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 size={16} /></Button>
                  </div>

                  {/* Subcategories */}
                  {isOpen && (
                    <div className="bg-muted/30">
                      {subs.length === 0 ? (
                        <div className="px-12 py-3 text-xs text-muted-foreground">
                          Sin subcategorías. <button onClick={() => openNewSub(m.id)} className="underline">Crear una</button>
                        </div>
                      ) : (
                        subs.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-center gap-2 border-t px-3 py-2 pl-12 ${!s.is_active ? "opacity-60" : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{s.name}</span>
                                <span className="text-xs text-muted-foreground">/{s.slug}</span>
                                {!s.is_active && <span className="text-xs text-destructive">Inactiva</span>}
                              </div>
                              {s.description && (
                                <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">#{s.sort_order}</span>
                            <Button variant="ghost" size="icon" onClick={() => moveSort(s, -1)}>▲</Button>
                            <Button variant="ghost" size="icon" onClick={() => moveSort(s, 1)}>▼</Button>
                            <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil size={16} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 size={16} /></Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? "Editar" : "Nueva"}{" "}
              {editing.parent_id ? "subcategoría" : "categoría principal"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría padre</Label>
                <Select
                  value={editing.parent_id ?? "__none__"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, parent_id: v === "__none__" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna (es principal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguna (es principal)</SelectItem>
                    {mainOptions
                      .filter((c) => c.id !== editing.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    name: e.target.value,
                    slug: p.id ? p.slug : slugify(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="auto desde el nombre"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descripción corta</Label>
              <Textarea
                rows={2}
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ícono</Label>
                <Input
                  value={editing.icon ?? ""}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  placeholder="🌿"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Activa</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Imagen (URL)</Label>
              <Input
                value={editing.image_url ?? ""}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>SEO · Meta título</Label>
              <Input
                value={editing.meta_title ?? ""}
                onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SEO · Meta descripción</Label>
              <Textarea
                rows={2}
                value={editing.meta_description ?? ""}
                onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="dark" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
