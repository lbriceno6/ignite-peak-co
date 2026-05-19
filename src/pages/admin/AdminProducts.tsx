import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown, Copy, Star } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";
import { PaginationBar } from "@/components/PaginationBar";
import { AdminReviewsDialog } from "@/components/admin/AdminReviewsDialog";

export default function AdminProducts() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reviewsFor, setReviewsFor] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("products")
      .select("*, supplier:suppliers(id, business_name, slug)", { count: "exact" })
      .order("sort_order", { ascending: true } as any)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const { data, count, error } = await query;
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  // Reset page on filter/size change
  useEffect(() => { setPage(1); }, [q, pageSize]);

  // Re-fetch when page, pageSize or search changes (debounced for search)
  useEffect(() => {
    const t = setTimeout(() => { load(); }, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q]);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Producto activado" : "Producto desactivado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Producto eliminado");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    // Reorder within the currently loaded page
    const idx = items.findIndex((p) => p.id === id);
    const swap = items[idx + dir];
    if (!swap) return;
    const cur = items[idx];
    await Promise.all([
      (supabase.from("products") as any).update({ sort_order: swap.sort_order ?? 0 }).eq("id", cur.id),
      (supabase.from("products") as any).update({ sort_order: cur.sort_order ?? 0 }).eq("id", swap.id),
    ]);
    load();
  };

  const duplicate = async (id: string) => {
    const src = items.find((p) => p.id === id);
    if (!src) return;
    const { id: _id, created_at, updated_at, supplier: _supplier, ...rest } = src;
    const base = src.slug || "product";
    let newSlug = `${base}-copy`;
    for (let i = 1; i < 50; i++) {
      const { data } = await supabase.from("products").select("id").eq("slug", newSlug).maybeSingle();
      if (!data) break;
      newSlug = `${base}-copy-${i + 1}`;
    }
    // Compute new sort_order from the global max in DB
    const { data: maxRow } = await supabase
      .from("products")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const maxSort = (maxRow as any)?.sort_order ?? 0;
    const payload = { ...rest, slug: newSlug, name: `${src.name} (copy)`, is_active: false, sort_order: maxSort + 1 };
    const { error } = await supabase.from("products").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Producto duplicado");
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Productos</h1>
          <p className="text-muted-foreground">{total} en total</p>
        </div>
        <Button asChild variant="dark"><Link to="/admin/products/new"><Plus size={16} /> Nuevo producto</Link></Button>
      </div>
      <Input placeholder="Buscar productos…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-24">Orden</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Activo</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, idx) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => move(p.id, -1)} disabled={idx === 0} aria-label="Subir">
                      <ArrowUp size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => move(p.id, 1)} disabled={idx === items.length - 1} aria-label="Bajar">
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
                <td className="p-3">
                  {p.supplier ? (
                    <Link to={`/proveedor/${p.supplier.slug}`} className="text-xs hover:underline">
                      {p.supplier.business_name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">{p.category}</td>
                <td className="p-3">S/ {Number(p.price).toFixed(2)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3"><Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => setReviewsFor({ id: p.id, name: p.name })} aria-label="Valoraciones" title="Valoraciones"><Star size={16} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicate(p.id)} aria-label="Duplicar"><Copy size={16} /></Button>
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/products/${p.id}/edit`}><Pencil size={16} /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 size={16} /></Button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={currentPage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
