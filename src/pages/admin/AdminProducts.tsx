import { useEffect, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown, Copy, Star, CheckCircle2, EyeOff } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";
import { PaginationBar } from "@/components/PaginationBar";
import { AdminReviewsDialog } from "@/components/admin/AdminReviewsDialog";

type VisibilityInfo = { visible: boolean; reasons: string[] };

function computeVisibility(p: any): VisibilityInfo {
  const reasons: string[] = [];
  if (!p.is_active) reasons.push("Inactivo");
  if (p.approval_status && p.approval_status !== "approved") {
    reasons.push(p.approval_status === "pending" ? "Pendiente de aprobación" : `Aprobación: ${p.approval_status}`);
  }
  if (!Number(p.stock) || Number(p.stock) <= 0) reasons.push("Sin stock");
  if (!p.price || Number(p.price) <= 0) reasons.push("Precio inválido");
  if (!p.main_image) reasons.push("Sin imagen");
  return { visible: reasons.length === 0, reasons };
}

export default function AdminProducts() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reviewsFor, setReviewsFor] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "drafts" | "visible" | "hidden" | "imported" | "no-stock">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [stockDialog, setStockDialog] = useState<{ id: string; name: string } | null>(null);
  const [stockValue, setStockValue] = useState<string>("10");
  const [searchParams] = useSearchParams();

  // Read ?filter=drafts from URL (used by importer "Ir a borradores")
  useEffect(() => {
    const f = searchParams.get("filter");
    const s = searchParams.get("status");
    if (f === "drafts" || f === "visible" || f === "hidden" || f === "imported" || f === "no-stock") setFilter(f);
    else if (s === "pending") setFilter("drafts");
  }, [searchParams]);

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
    if (filter === "drafts") {
      query = query.or("is_active.eq.false,approval_status.eq.pending");
    } else if (filter === "visible") {
      query = query.eq("is_active", true).eq("approval_status", "approved").gt("stock", 0);
    } else if (filter === "hidden") {
      query = query.or("is_active.eq.false,approval_status.neq.approved,stock.eq.0");
    } else if (filter === "imported") {
      query = query.not("source_url", "is", null);
    } else if (filter === "no-stock") {
      query = query.eq("stock", 0);
    }
    const { data, count, error } = await query;
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { setPage(1); }, [q, pageSize, filter]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q, filter]);

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
    const { data: maxRow } = await supabase
      .from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const maxSort = (maxRow as any)?.sort_order ?? 0;
    const payload = { ...rest, slug: newSlug, name: `${src.name} (copy)`, is_active: false, sort_order: maxSort + 1 };
    const { error } = await supabase.from("products").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Producto duplicado");
    load();
  };

  const publishOne = async (p: any) => {
    if (!p.price || Number(p.price) <= 0) {
      return toast.error("Agrega un precio válido antes de publicar");
    }
    if (!p.category) {
      const ok = confirm("Este producto no tiene categoría. ¿Publicar de todos modos?");
      if (!ok) return;
    }
    if (!Number(p.stock) || Number(p.stock) <= 0) {
      setStockValue("10");
      setStockDialog({ id: p.id, name: p.name });
      return;
    }
    const { error } = await supabase.from("products")
      .update({ is_active: true, approval_status: "approved" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Producto publicado. Ya es visible para los usuarios.");
    load();
  };

  const previewAsPublic = (p: any) => {
    const vis = computeVisibility(p);
    if (vis.visible) {
      toast.success("Visible para admin y público.");
    } else {
      toast.warning(`Visible para admin, pero NO para público: ${vis.reasons.join(" · ")}`, { duration: 7000 });
    }
  };

  const confirmStockAndPublish = async () => {
    if (!stockDialog) return;
    const stockNum = Number(stockValue);
    if (!stockNum || stockNum <= 0) return toast.error("Ingresa un stock válido (> 0)");
    const { error } = await supabase.from("products")
      .update({ is_active: true, approval_status: "approved", stock: stockNum })
      .eq("id", stockDialog.id);
    if (error) return toast.error(error.message);
    toast.success("Producto publicado");
    setStockDialog(null);
    load();
  };

  const bulkPublish = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    // Set stock=1 only if current stock is 0
    const targets = items.filter((p) => ids.includes(p.id));
    const needStock = targets.filter((p) => !Number(p.stock) || Number(p.stock) <= 0);
    const fullyReady = targets.filter((p) => Number(p.stock) > 0);
    let ok = 0;
    if (fullyReady.length) {
      const { error } = await supabase.from("products")
        .update({ is_active: true, approval_status: "approved" })
        .in("id", fullyReady.map((p) => p.id));
      if (!error) ok += fullyReady.length;
    }
    if (needStock.length) {
      const { error } = await supabase.from("products")
        .update({ is_active: true, approval_status: "approved", stock: 1 })
        .in("id", needStock.map((p) => p.id));
      if (!error) ok += needStock.length;
    }
    toast.success(`${ok} producto(s) publicado(s)${needStock.length ? ` · ${needStock.length} con stock=1 por defecto` : ""}`);
    setSelected(new Set());
    setBulkOpen(false);
    load();
  };

  const allChecked = items.length > 0 && items.every((p) => selected.has(p.id));
  const toggleAll = (v: boolean) => {
    if (v) setSelected(new Set(items.map((p) => p.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(id); else next.delete(id);
    setSelected(next);
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

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar productos…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="drafts">Borradores / pendientes</SelectItem>
            <SelectItem value="visible">Visibles en tienda</SelectItem>
            <SelectItem value="hidden">Ocultos en tienda</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="dark" size="sm" onClick={() => setBulkOpen(true)}>
            <CheckCircle2 size={14} className="mr-1" /> Publicar seleccionados ({selected.size})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-8">
                <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} aria-label="Seleccionar todo" />
              </th>
              <th className="p-3 w-20">Orden</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Aprob.</th>
              <th className="p-3">Activo</th>
              <th className="p-3">Visible</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, idx) => {
              const vis = computeVisibility(p);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={(v) => toggleOne(p.id, !!v)}
                      aria-label={`Seleccionar ${p.name}`}
                    />
                  </td>
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
                  <td className="p-3">
                    <Badge variant={p.approval_status === "approved" ? "secondary" : p.approval_status === "rejected" ? "destructive" : "outline"}>
                      {p.approval_status ?? "—"}
                    </Badge>
                  </td>
                  <td className="p-3"><Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} /></td>
                  <td className="p-3">
                    {vis.visible ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Sí</Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="outline" className="gap-1"><EyeOff size={12} /> No</Badge>
                        <div className="text-[11px] text-muted-foreground leading-tight">
                          {vis.reasons.join(" · ")}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {!vis.visible && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => publishOne(p)}
                        aria-label="Publicar"
                        title="Publicar producto"
                      >
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setReviewsFor({ id: p.id, name: p.name })} aria-label="Valoraciones" title="Valoraciones"><Star size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicate(p.id)} aria-label="Duplicar"><Copy size={16} /></Button>
                    <Button asChild variant="ghost" size="icon"><Link to={`/admin/products/${p.id}/edit`}><Pencil size={16} /></Link></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Sin productos</td></tr>
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
      <AdminReviewsDialog
        open={!!reviewsFor}
        onOpenChange={(v) => { if (!v) setReviewsFor(null); }}
        productId={reviewsFor?.id ?? null}
        productName={reviewsFor?.name}
      />

      {/* Bulk publish confirm */}
      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar {selected.size} producto(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Se activarán y aprobarán los productos seleccionados. Si alguno tiene stock 0, se ajustará a 1 para que sea visible (puedes corregirlo después).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={bulkPublish}>Publicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock prompt for single publish */}
      <Dialog open={!!stockDialog} onOpenChange={(v) => { if (!v) setStockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar stock para publicar</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              "{stockDialog?.name}" tiene stock 0. Ingresa el stock disponible para publicarlo.
            </p>
            <Label htmlFor="stock-input">Stock</Label>
            <Input
              id="stock-input"
              type="number"
              min={1}
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(null)}>Cancelar</Button>
            <Button onClick={confirmStockAndPublish}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
