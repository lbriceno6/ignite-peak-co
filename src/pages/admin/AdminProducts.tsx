import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";

export default function AdminProducts() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true } as any)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Product activated" : "Product deactivated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    // Reorder within the currently filtered list
    const list = filtered;
    const idx = list.findIndex((p) => p.id === id);
    const swap = list[idx + dir];
    if (!swap) return;
    const cur = list[idx];
    await Promise.all([
      (supabase.from("products") as any).update({ sort_order: swap.sort_order ?? 0 }).eq("id", cur.id),
      (supabase.from("products") as any).update({ sort_order: cur.sort_order ?? 0 }).eq("id", swap.id),
    ]);
    load();
  };

  const duplicate = async (id: string) => {
    const src = items.find((p) => p.id === id);
    if (!src) return;
    const { id: _id, created_at, updated_at, ...rest } = src;
    const base = src.slug || "product";
    let newSlug = `${base}-copy`;
    // ensure unique slug
    for (let i = 1; i < 50; i++) {
      const { data } = await supabase.from("products").select("id").eq("slug", newSlug).maybeSingle();
      if (!data) break;
      newSlug = `${base}-copy-${i + 1}`;
    }
    const maxSort = items.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0);
    const payload = { ...rest, slug: newSlug, name: `${src.name} (copy)`, is_active: false, sort_order: maxSort + 1 };
    const { error } = await supabase.from("products").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Product duplicated");
    load();
  };

  const filtered = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Products</h1>
          <p className="text-muted-foreground">{items.length} total</p>
        </div>
        <Button asChild variant="dark"><Link to="/admin/products/new"><Plus size={16} /> New product</Link></Button>
      </div>
      <Input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-24">Order</th>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="Move up">
                      <ArrowUp size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => move(p.id, 1)} disabled={i === filtered.length - 1} aria-label="Move down">
                      <ArrowDown size={16} />
                    </Button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveProductImage(p.main_image)}
                      alt={p.name}
                      className="h-10 w-10 rounded object-cover bg-muted"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveProductImage(null); }}
                    />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{p.category}</td>
                <td className="p-3">${Number(p.price).toFixed(2)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3"><Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => duplicate(p.id)} aria-label="Duplicate"><Copy size={16} /></Button>
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/products/${p.id}/edit`}><Pencil size={16} /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 size={16} /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
