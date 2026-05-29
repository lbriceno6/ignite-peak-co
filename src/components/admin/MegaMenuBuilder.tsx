import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react";

const sb: any = supabase;

type Column = {
  id: string;
  parent_nav: string;
  title: string;
  position: number;
  see_all_label: string | null;
  see_all_href: string | null;
  show_desktop: boolean;
  show_mobile: boolean;
  is_active: boolean;
};

type Item = {
  id: string;
  column_id: string;
  display_label: string;
  link_type: "category" | "goal" | "page" | "url";
  category_id: string | null;
  goal_id: string | null;
  url: string | null;
  icon: string | null;
  image_url: string | null;
  open_in_new_tab: boolean;
  position: number;
  show_desktop: boolean;
  show_mobile: boolean;
  is_active: boolean;
  seo_note: string | null;
};

type Cat = { id: string; name: string; slug: string };
type Goal = { id: string; name: string; slug: string };

type NavSetting = { parent_nav: string; label: string; href: string; position: number };

const DEFAULT_NAVS: NavSetting[] = [
  { parent_nav: "products", label: "Productos", href: "/productos", position: 1 },
  { parent_nav: "goals", label: "Compra por objetivo", href: "/objetivos", position: 2 },
];

export default function MegaMenuBuilder() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [navs, setNavs] = useState<NavSetting[]>(DEFAULT_NAVS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingNav, setSavingNav] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, i, ca, go, nv] = await Promise.all([
      sb.from("mega_menu_columns").select("*").order("parent_nav").order("position"),
      sb.from("mega_menu_items").select("*").order("position"),
      sb.from("categories").select("id,name,slug").eq("is_active", true).order("name"),
      sb.from("goals").select("id,name,slug").eq("is_active", true).order("name"),
      sb.from("mega_menu_nav_settings").select("*").order("position"),
    ]);
    setColumns((c.data ?? []) as Column[]);
    setItems((i.data ?? []) as Item[]);
    setCats((ca.data ?? []) as Cat[]);
    setGoals((go.data ?? []) as Goal[]);
    const fetched = (nv.data ?? []) as NavSetting[];
    const merged = DEFAULT_NAVS.map((d) => fetched.find((f) => f.parent_nav === d.parent_nav) || d);
    setNavs(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateNav = (parent: string, patch: Partial<NavSetting>) =>
    setNavs((ns) => ns.map((n) => (n.parent_nav === parent ? { ...n, ...patch } : n)));

  const addNav = async () => {
    const slug = prompt("Identificador único (sin espacios, ej: ofertas):")?.trim().toLowerCase();
    if (!slug) return;
    if (!/^[a-z0-9_-]+$/.test(slug)) return toast.error("Solo letras, números, guiones y guión bajo");
    if (navs.some((n) => n.parent_nav === slug)) return toast.error("Ya existe ese identificador");
    const label = prompt("Nombre visible:", "Nuevo menú")?.trim() || "Nuevo menú";
    const href = prompt("URL (ej: /ofertas):", "/" + slug)?.trim() || "/" + slug;
    const position = Math.max(0, ...navs.map((n) => n.position)) + 1;
    const { error } = await sb.from("mega_menu_nav_settings").insert({ parent_nav: slug, label, href, position });
    if (error) return toast.error(error.message);
    setNavs((ns) => [...ns, { parent_nav: slug, label, href, position }]);
    toast.success("Menú padre creado");
  };

  const deleteNav = async (parent: string) => {
    if (DEFAULT_NAVS.some((d) => d.parent_nav === parent)) return toast.error("No se puede eliminar un menú por defecto");
    if (!confirm(`¿Eliminar el menú "${parent}"? Las columnas asociadas quedarán huérfanas.`)) return;
    const { error } = await sb.from("mega_menu_nav_settings").delete().eq("parent_nav", parent);
    if (error) return toast.error(error.message);
    setNavs((ns) => ns.filter((n) => n.parent_nav !== parent));
    toast.success("Menú padre eliminado");
  };

  const saveNav = async (nav: NavSetting) => {
    setSavingNav(nav.parent_nav);
    const { error } = await sb.from("mega_menu_nav_settings").upsert({
      parent_nav: nav.parent_nav,
      label: nav.label,
      href: nav.href,
      position: nav.position,
    }, { onConflict: "parent_nav" });
    setSavingNav(null);
    if (error) return toast.error(error.message);
    toast.success("Nombre del menú guardado");
  };


  const addColumn = async () => {
    const maxPos = Math.max(0, ...columns.filter((c) => c.parent_nav === "products").map((c) => c.position));
    const { data, error } = await sb
      .from("mega_menu_columns")
      .insert({ parent_nav: "products", title: "Nueva columna", position: maxPos + 1, see_all_label: "Ver todo" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setColumns((cs) => [...cs, data as Column]);
    toast.success("Columna creada");
  };

  const updateColumn = (id: string, patch: Partial<Column>) =>
    setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const saveColumn = async (col: Column) => {
    setSavingId(col.id);
    const { id, ...rest } = col;
    const { error } = await sb.from("mega_menu_columns").update(rest).eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Columna guardada");
  };

  const deleteColumn = async (id: string) => {
    if (!confirm("¿Eliminar columna y todos sus items?")) return;
    const { error } = await sb.from("mega_menu_columns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setColumns((cs) => cs.filter((c) => c.id !== id));
    setItems((is) => is.filter((i) => i.column_id !== id));
  };

  const addItem = async (columnId: string) => {
    const maxPos = Math.max(0, ...items.filter((i) => i.column_id === columnId).map((i) => i.position));
    const { data, error } = await sb
      .from("mega_menu_items")
      .insert({
        column_id: columnId,
        display_label: "Nuevo enlace",
        link_type: "category",
        position: maxPos + 1,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setItems((is) => [...is, data as Item]);
  };

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const saveItem = async (item: Item) => {
    setSavingId(item.id);
    const { id, ...rest } = item;
    const { error } = await sb.from("mega_menu_items").update(rest).eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Enlace guardado");
  };

  const deleteItem = async (id: string) => {
    const { error } = await sb.from("mega_menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((is) => is.filter((i) => i.id !== id));
  };

  const moveItem = async (item: Item, dir: -1 | 1) => {
    const newPos = item.position + dir;
    updateItem(item.id, { position: newPos });
    await sb.from("mega_menu_items").update({ position: newPos }).eq("id", item.id);
  };

  const colsByNav = useMemo(() => {
    const map: Record<string, Column[]> = {};
    columns.forEach((c) => { (map[c.parent_nav] ||= []).push(c); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [columns]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Mega Menú</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea columnas para los menús "Productos" y "Compra por objetivo". El nombre visible no afecta el slug ni la URL.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/" target="_blank" rel="noopener noreferrer"><Eye size={14}/> Vista previa</a>
          </Button>
          <Button onClick={addColumn} size="sm"><Plus size={14}/> Nueva columna</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border bg-secondary/30 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nombres de los menús padre
          </h3>
          <div className="space-y-3">
            {navs.map((nav) => (
              <div key={nav.parent_nav} className="grid items-end gap-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label className="text-xs">Identificador</Label>
                  <Input value={nav.parent_nav} disabled />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs">Nombre visible</Label>
                  <Input value={nav.label} onChange={(e) => updateNav(nav.parent_nav, { label: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs">URL "Ver todo"</Label>
                  <Input value={nav.href} onChange={(e) => updateNav(nav.parent_nav, { href: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Button size="sm" className="w-full" onClick={() => saveNav(nav)} disabled={savingNav === nav.parent_nav}>
                    {savingNav === nav.parent_nav ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Guardar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {navs.map((nav) => (
          <div key={nav.parent_nav} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Menú: {nav.label}
            </h3>
            <Accordion type="multiple" className="space-y-2">
              {(colsByNav[nav.parent_nav] || []).map((col) => {
                const colItems = items
                  .filter((i) => i.column_id === col.id)
                  .sort((a, b) => a.position - b.position);
                return (
                  <AccordionItem key={col.id} value={col.id} className="rounded-md border bg-card px-3">
                    <AccordionTrigger className="text-left">
                      <span className="font-medium">{col.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({colItems.length} items)</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="text-xs">Título de columna</Label>
                          <Input value={col.title} onChange={(e) => updateColumn(col.id, { title: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Asociado al menú</Label>
                          <Select value={col.parent_nav} onValueChange={(v) => updateColumn(col.id, { parent_nav: v })}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {navs.map((n) => <SelectItem key={n.parent_nav} value={n.parent_nav}>{n.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Texto "Ver todo"</Label>
                          <Input value={col.see_all_label ?? ""} onChange={(e) => updateColumn(col.id, { see_all_label: e.target.value })} placeholder="Ver todo" />
                        </div>
                        <div>
                          <Label className="text-xs">URL "Ver todo"</Label>
                          <Input value={col.see_all_href ?? ""} onChange={(e) => updateColumn(col.id, { see_all_href: e.target.value })} placeholder="/categoria/..." />
                        </div>
                        <div>
                          <Label className="text-xs">Posición</Label>
                          <Input type="number" value={col.position} onChange={(e) => updateColumn(col.id, { position: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex flex-wrap items-end gap-4">
                          <label className="flex items-center gap-2 text-sm"><Switch checked={col.show_desktop} onCheckedChange={(v) => updateColumn(col.id, { show_desktop: v })}/> Desktop</label>
                          <label className="flex items-center gap-2 text-sm"><Switch checked={col.show_mobile} onCheckedChange={(v) => updateColumn(col.id, { show_mobile: v })}/> Móvil</label>
                          <label className="flex items-center gap-2 text-sm"><Switch checked={col.is_active} onCheckedChange={(v) => updateColumn(col.id, { is_active: v })}/> Activo</label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveColumn(col)} disabled={savingId === col.id}>
                          {savingId === col.id ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Guardar columna
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteColumn(col.id)}><Trash2 size={14}/> Eliminar</Button>
                      </div>

                      <div className="rounded-md border bg-secondary/30 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</h4>
                          <Button size="sm" variant="outline" onClick={() => addItem(col.id)}><Plus size={14}/> Agregar item</Button>
                        </div>
                        <div className="space-y-2">
                          {colItems.map((item) => (
                            <ItemRow
                              key={item.id}
                              item={item}
                              cats={cats}
                              goals={goals}
                              saving={savingId === item.id}
                              onChange={(p) => updateItem(item.id, p)}
                              onSave={() => saveItem(item)}
                              onDelete={() => deleteItem(item.id)}
                              onMoveUp={() => moveItem(item, -1)}
                              onMoveDown={() => moveItem(item, 1)}
                            />
                          ))}
                          {colItems.length === 0 && <p className="text-xs text-muted-foreground">Sin items.</p>}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            {(colsByNav[nav.parent_nav] || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay columnas para este menú.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item, cats, goals, saving, onChange, onSave, onDelete, onMoveUp, onMoveDown,
}: {
  item: Item;
  cats: Cat[];
  goals: Goal[];
  saving: boolean;
  onChange: (p: Partial<Item>) => void;
  onSave: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-12">
      <div className="flex flex-col items-center gap-1 md:col-span-1">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveUp}><ChevronUp size={14}/></Button>
        <span className="text-xs text-muted-foreground">{item.position}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveDown}><ChevronDown size={14}/></Button>
      </div>
      <div className="md:col-span-3">
        <Label className="text-xs">Nombre visible</Label>
        <Input value={item.display_label} onChange={(e) => onChange({ display_label: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Tipo</Label>
        <Select value={item.link_type} onValueChange={(v: any) => onChange({ link_type: v, category_id: null, goal_id: null, url: null })}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Categoría</SelectItem>
            <SelectItem value="goal">Objetivo</SelectItem>
            <SelectItem value="page">Página</SelectItem>
            <SelectItem value="url">URL personalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-4">
        <Label className="text-xs">Destino</Label>
        {item.link_type === "category" && (
          <Select value={item.category_id ?? ""} onValueChange={(v) => onChange({ category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona categoría"/></SelectTrigger>
            <SelectContent>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.slug})</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {item.link_type === "goal" && (
          <Select value={item.goal_id ?? ""} onValueChange={(v) => onChange({ goal_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona objetivo"/></SelectTrigger>
            <SelectContent>
              {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.slug})</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(item.link_type === "page" || item.link_type === "url") && (
          <Input value={item.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="/ruta o https://..." />
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3 md:col-span-12">
        <Input className="w-32" placeholder="Ícono (emoji)" value={item.icon ?? ""} onChange={(e) => onChange({ icon: e.target.value })} />
        <Input className="w-48" placeholder="Imagen URL" value={item.image_url ?? ""} onChange={(e) => onChange({ image_url: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><Switch checked={item.show_desktop} onCheckedChange={(v) => onChange({ show_desktop: v })}/> Desktop</label>
        <label className="flex items-center gap-2 text-xs"><Switch checked={item.show_mobile} onCheckedChange={(v) => onChange({ show_mobile: v })}/> Móvil</label>
        <label className="flex items-center gap-2 text-xs"><Switch checked={item.open_in_new_tab} onCheckedChange={(v) => onChange({ open_in_new_tab: v })}/> Nueva pestaña</label>
        <label className="flex items-center gap-2 text-xs"><Switch checked={item.is_active} onCheckedChange={(v) => onChange({ is_active: v })}/> Activo</label>
        <Input className="w-64" placeholder="Nota SEO interna (opcional)" value={item.seo_note ?? ""} onChange={(e) => onChange({ seo_note: e.target.value })} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Guardar
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 size={14}/></Button>
        </div>
      </div>
    </div>
  );
}
