import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Row = {
  id: string; slug: string; name: string; price: number; sale_price: number | null;
  stock: number; is_active: boolean; main_image: string | null; category: string | null;
};

export default function SupplierProducts() {
  const { supplierId } = useAuth();
  const { format } = useCurrency();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id,slug,name,price,sale_price,stock,is_active,main_image,category")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [supplierId]);

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from("products").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (r: Row) => {
    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Mis productos</h1>
          <p className="text-sm text-muted-foreground">{rows.length} en catálogo</p>
        </div>
        <Button asChild variant="dark"><Link to="/supplier/products/new"><Plus size={16}/> Nuevo</Link></Button>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Aún no tienes productos. <Link to="/supplier/products/new" className="underline">Crea el primero</Link>.
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.main_image
                    ? <img src={r.main_image} alt="" className="h-10 w-10 rounded object-cover" />
                    : <div className="h-10 w-10 rounded bg-muted" />}
                </TableCell>
                <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.slug}</div></TableCell>
                <TableCell className="text-xs">{r.category ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {format(Number(r.sale_price ?? r.price))}
                  {r.sale_price && <div className="text-muted-foreground line-through">{format(Number(r.price))}</div>}
                </TableCell>
                <TableCell className="text-right">{r.stock}</TableCell>
                <TableCell>
                  <button onClick={() => toggleActive(r)}>
                    <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Publicado" : "Borrador"}</Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon"><Link to={`/supplier/products/${r.id}/edit`}><Pencil size={14}/></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 size={14}/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
