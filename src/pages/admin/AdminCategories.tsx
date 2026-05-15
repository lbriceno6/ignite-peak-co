import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "product" | "blog";
  description: string | null;
  icon: string | null;
  sort_order: number;
};

const empty: Partial<Category> = { name: "", slug: "", type: "product", description: "", icon: "", sort_order: 0 };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [tab, setTab] = useState<"product" | "blog">("product");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category>>(empty);

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
    setItems((data as Category[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...empty, type: tab }); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setOpen(true); };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name is required");
    const payload = {
      name: editing.name!,
      slug: editing.slug || slugify(editing.name!),
      type: editing.type as "product" | "blog",
      description: editing.description || null,
      icon: editing.icon || null,
      sort_order: Number(editing.sort_order) || 0,
    };
    const res = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing.id ? "Category updated" : "Category created");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    load();
  };

  const filtered = items.filter((c) => c.type === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Categories</h1>
          <p className="text-muted-foreground">{items.length} total</p>
        </div>
        <Button variant="dark" onClick={openNew}><Plus size={16} /> New category</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="product">Products ({items.filter(i => i.type === "product").length})</TabsTrigger>
          <TabsTrigger value="blog">Blog ({items.filter(i => i.type === "blog").length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Order</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {c.icon && <span>{c.icon}</span>}
                        <span className="font-medium">{c.name}</span>
                      </div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.slug}</td>
                    <td className="p-3">{c.sort_order}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No categories yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={editing.slug ?? ""} placeholder="auto from name" onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icon (emoji)</Label>
                <Input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="dark" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
