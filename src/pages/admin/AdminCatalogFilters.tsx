import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ALL_PAGES, FILTER_TYPE_META, type CatalogFilter } from "@/hooks/useCatalogFilters";

const sb = supabase as any;

export default function AdminCatalogFilters() {
  const [items, setItems] = useState<(CatalogFilter & { options_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: defs }, { data: opts }] = await Promise.all([
      sb.from("catalog_filters").select("*").order("display_order"),
      sb.from("catalog_filter_options").select("filter_id"),
    ]);
    const counts: Record<string, number> = {};
    ((opts ?? []) as any[]).forEach((o) => { counts[o.filter_id] = (counts[o.filter_id] ?? 0) + 1; });
    setItems(((defs ?? []) as any[]).map((d) => ({
      ...d,
      pages_visibility: Array.isArray(d.pages_visibility) ? d.pages_visibility : [],
      options: [],
      options_count: counts[d.id] ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (f: CatalogFilter, field: "is_active" | "show_desktop" | "show_mobile") => {
    const { error } = await sb.from("catalog_filters").update({ [field]: !f[field] }).eq("id", f.id);
    if (error) return toast.error(error.message);
    load();
  };

  const move = async (f: CatalogFilter, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === f.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await Promise.all([
      sb.from("catalog_filters").update({ display_order: swap.display_order }).eq("id", f.id),
      sb.from("catalog_filters").update({ display_order: f.display_order }).eq("id", swap.id),
    ]);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("catalog_filters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Filtro eliminado");
    load();
  };

  const typeLabel = (k: string) => FILTER_TYPE_META.find((t) => t.key === k)?.label ?? k;
  const pageLabel = (k: string) => ALL_PAGES.find((p) => p.key === k)?.label ?? k;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Filtros del catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controla todos los filtros del ecommerce desde un solo lugar. Estos filtros se aplican
            automáticamente en todas las páginas donde estén habilitados (tienda, categorías,
            subcategorías, marcas, búsqueda, necesidades, promociones, combos y más).
          </p>
        </div>
        <Button asChild variant="dark">
          <Link to="/admin/catalog-filters/new"><Plus size={16} /> Nuevo filtro</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Filtro</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Opciones</th>
              <th className="p-3 max-w-xs">Páginas</th>
              <th className="p-3 text-center">Desktop</th>
              <th className="p-3 text-center">Móvil</th>
              <th className="p-3 text-center">Activo</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f, idx) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.slug}</div>
                </td>
                <td className="p-3"><Badge variant="outline">{typeLabel(f.filter_type)}</Badge></td>
                <td className="p-3 text-center">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {f.options_count}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex max-w-md flex-wrap gap-1">
                    {(f.pages_visibility ?? []).slice(0, 5).map((p) => (
                      <Badge key={p} variant="secondary" className="text-[10px]">{pageLabel(p)}</Badge>
                    ))}
                    {(f.pages_visibility ?? []).length > 5 && (
                      <Badge variant="secondary" className="text-[10px]">+{(f.pages_visibility ?? []).length - 5}</Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center"><Switch checked={f.show_desktop} onCheckedChange={() => toggle(f, "show_desktop")} /></td>
                <td className="p-3 text-center"><Switch checked={f.show_mobile} onCheckedChange={() => toggle(f, "show_mobile")} /></td>
                <td className="p-3 text-center"><Switch checked={f.is_active} onCheckedChange={() => toggle(f, "is_active")} /></td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => move(f, -1)}><ArrowUp size={16} /></Button>
                  <Button variant="ghost" size="icon" disabled={idx === items.length - 1} onClick={() => move(f, 1)}><ArrowDown size={16} /></Button>
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/catalog-filters/${f.id}/edit`}><Pencil size={16} /></Link></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 size={16} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar filtro "{f.name}"</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán también todas sus opciones y se quitará de todas las páginas. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(f.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {!loading && !items.length && (
              <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Aún no hay filtros configurados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
