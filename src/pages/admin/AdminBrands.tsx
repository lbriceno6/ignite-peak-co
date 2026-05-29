import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ImageOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  short_description: string | null;
  is_active: boolean;
  display_order: number;
  product_count?: number;
};

const sb = supabase as any;

export default function AdminBrands() {
  const [items, setItems] = useState<Brand[]>([]);
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("__null__");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: brands } = await sb
      .from("brands")
      .select("id,name,slug,logo_url,banner_url,short_description,is_active,display_order")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    const list = (brands as Brand[]) ?? [];
    // Count products per brand
    const counts = await Promise.all(
      list.map(async (b) => {
        const { count } = await sb
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", b.id);
        return [b.id, count ?? 0] as const;
      }),
    );
    const map = new Map(counts);
    setItems(list.map((b) => ({ ...b, product_count: map.get(b.id) ?? 0 })));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, v: boolean) => {
    const { error } = await sb.from("brands").update({ is_active: v }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(v ? "Marca activada" : "Marca desactivada");
    load();
  };

  const otherBrands = useMemo(
    () => items.filter((b) => b.id !== deleting?.id),
    [items, deleting],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if ((deleting.product_count ?? 0) > 0) {
        const target = reassignTo === "__null__" ? null : reassignTo;
        const { error: upErr } = await sb
          .from("products")
          .update({ brand_id: target })
          .eq("brand_id", deleting.id);
        if (upErr) throw upErr;
      }
      const { error } = await sb.from("brands").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Marca eliminada");
      setDeleting(null);
      setReassignTo("__null__");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = items.filter((b) =>
    b.name.toLowerCase().includes(q.toLowerCase()) ||
    b.slug.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Marcas</h1>
          <p className="text-muted-foreground">{items.length} marcas registradas</p>
        </div>
        <Button asChild variant="dark">
          <Link to="/admin/brands/new"><Plus size={16} /> Nueva marca</Link>
        </Button>
      </div>

      <Input
        placeholder="Buscar marca…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Marca</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Productos</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activa</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded object-contain bg-muted/30 border" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded bg-muted text-muted-foreground">
                        <ImageOff size={14} />
                      </div>
                    )}
                    <div className="font-medium">{b.name}</div>
                  </div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">/marca/{b.slug}</td>
                <td className="p-3 text-muted-foreground max-w-[280px] truncate">{b.short_description ?? "—"}</td>
                <td className="p-3">{b.product_count ?? 0}</td>
                <td className="p-3">{b.display_order}</td>
                <td className="p-3">
                  <Switch checked={b.is_active} onCheckedChange={(v) => toggleActive(b.id, v)} />
                </td>
                <td className="p-3 text-right">
                  <Button asChild variant="ghost" size="icon">
                    <Link to={`/admin/brands/${b.id}/edit`}><Pencil size={16} /></Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setDeleting(b); setReassignTo("__null__"); }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin marcas todavía</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que deseas eliminar esta marca?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {(deleting?.product_count ?? 0) > 0 ? (
                  <div className="space-y-3">
                    <p>
                      Esta marca tiene <strong>{deleting?.product_count} producto(s) asociado(s)</strong>.
                      Puedes reasignarlos a otra marca antes de eliminar.
                    </p>
                    <div className="space-y-1.5">
                      <Label>Reasignar productos a:</Label>
                      <Select value={reassignTo} onValueChange={setReassignTo}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__null__">Quitar marca (dejar sin marca)</SelectItem>
                          {otherBrands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p>Esta acción no se puede deshacer.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
