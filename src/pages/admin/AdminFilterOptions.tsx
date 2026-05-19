import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";

type FilterGroup = "type" | "goal" | "flavor" | "size";

type FilterOption = {
  id: string;
  group: FilterGroup;
  label: string;
  value: string;
  sort_order: number;
  is_enabled: boolean;
};

const GROUPS: { key: FilterGroup; title: string }[] = [
  { key: "type", title: "Tipo de producto" },
  { key: "goal", title: "Objetivo" },
  { key: "flavor", title: "Sabor" },
  { key: "size", title: "Tamaño" },
];

const empty: Partial<FilterOption> = {
  group: "type", label: "", value: "", sort_order: 0, is_enabled: true,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminFilterOptions() {
  const [items, setItems] = useState<FilterOption[]>([]);
  const [tab, setTab] = useState<FilterGroup>("type");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FilterOption>>(empty);
  const [loading, setLoading] = useState(false);

  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: itemsData, error: itemsError }, { data: productsData, error: productsError }] = await Promise.all([
      supabase
        .from("filter_options" as any)
        .select("*")
        .order("group")
        .order("sort_order")
        .order("label"),
      supabase
        .from("products" as any)
        .select("category, goal, flavor, size"),
    ]);
    if (itemsError) toast.error(itemsError.message);
    if (productsError) toast.error(productsError.message);
    setItems(((itemsData as any) ?? []) as FilterOption[]);

    const counts: Record<string, number> = {};
    (productsData as any)?.forEach((p: any) => {
      if (p.category) counts[`type:${p.category}`] = (counts[`type:${p.category}`] || 0) + 1;
      if (p.goal) counts[`goal:${p.goal}`] = (counts[`goal:${p.goal}`] || 0) + 1;
      if (p.flavor) counts[`flavor:${p.flavor}`] = (counts[`flavor:${p.flavor}`] || 0) + 1;
      if (p.size) counts[`size:${p.size}`] = (counts[`size:${p.size}`] || 0) + 1;
    });
    setProductCounts(counts);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((i) => i.group === tab).sort((a, b) => a.sort_order - b.sort_order),
    [items, tab],
  );

  const openNew = () => { setEditing({ ...empty, group: tab }); setOpen(true); };
  const openEdit = (o: FilterOption) => { setEditing(o); setOpen(true); };

  const save = async () => {
    if (!editing.label?.trim()) return toast.error("La etiqueta es obligatoria");
    const payload = {
      group: editing.group as FilterGroup,
      label: editing.label!.trim(),
      value: (editing.value?.trim() || (editing.group === "goal" ? slugify(editing.label!) : editing.label!.trim())),
      sort_order: Number(editing.sort_order) || 0,
      is_enabled: editing.is_enabled ?? true,
    };
    const res = editing.id
      ? await supabase.from("filter_options" as any).update(payload).eq("id", editing.id)
      : await supabase.from("filter_options" as any).insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing.id ? "Opción actualizada" : "Opción creada");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta opción?")) return;
    const { error } = await supabase.from("filter_options" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Opción eliminada");
    load();
  };

  const toggleEnabled = async (o: FilterOption) => {
    const { error } = await supabase
      .from("filter_options" as any)
      .update({ is_enabled: !o.is_enabled })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    load();
  };

  const move = async (o: FilterOption, dir: -1 | 1) => {
    const list = filtered;
    const idx = list.findIndex((i) => i.id === o.id);
    const swap = list[idx + dir];
    if (!swap) return;
    const a = supabase.from("filter_options" as any).update({ sort_order: swap.sort_order }).eq("id", o.id);
    const b = supabase.from("filter_options" as any).update({ sort_order: o.sort_order }).eq("id", swap.id);
    const [ra, rb] = await Promise.all([a, b]);
    if (ra.error || rb.error) return toast.error((ra.error || rb.error)!.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Opciones de filtro</h1>
          <p className="text-muted-foreground">
            Gestiona las opciones que ven los clientes en los filtros del catálogo.
          </p>
        </div>
        <Button variant="dark" onClick={openNew}><Plus size={16} /> Nueva opción</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterGroup)}>
        <TabsList>
          {GROUPS.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.title} ({items.filter((i) => i.group === g.key).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key} className="mt-4">
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Etiqueta</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3 w-24 text-center">Productos</th>
                    <th className="p-3 w-20">Orden</th>
                    <th className="p-3 w-32">Habilitada</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, idx) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-3 font-medium">{o.label}</td>
                      <td className="p-3 text-muted-foreground">{o.value}</td>
                      <td className="p-3">{o.sort_order}</td>
                      <td className="p-3">
                        <Switch checked={o.is_enabled} onCheckedChange={() => toggleEnabled(o)} />
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost" size="icon"
                          disabled={idx === 0}
                          onClick={() => move(o, -1)}
                          title="Subir"
                        ><ArrowUp size={16} /></Button>
                        <Button
                          variant="ghost" size="icon"
                          disabled={idx === filtered.length - 1}
                          onClick={() => move(o, 1)}
                          title="Bajar"
                        ><ArrowDown size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(o)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin opciones</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar opción" : "Nueva opción"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Grupo</Label>
              <Select
                value={editing.group}
                onValueChange={(v) => setEditing({ ...editing, group: v as FilterGroup })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => (
                    <SelectItem key={g.key} value={g.key}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Etiqueta visible</Label>
              <Input
                value={editing.label ?? ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor interno {editing.group === "goal" && "(slug del objetivo)"}</Label>
              <Input
                value={editing.value ?? ""}
                placeholder="Se autogenera desde la etiqueta"
                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Debe coincidir con el valor almacenado en los productos para que el filtro encuentre coincidencias.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                  <Switch
                    checked={editing.is_enabled ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_enabled: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {editing.is_enabled ?? true ? "Habilitada" : "Deshabilitada"}
                  </span>
                </div>
              </div>
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
