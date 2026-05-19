import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const AdminResellerTiers = () => {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await (supabase as any).from("reseller_tiers").select("*").order("sort_order");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, k: string, v: any) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, [k]: v } : r));

  const save = async (r: any) => {
    const { error } = await (supabase as any).from("reseller_tiers").update({
      name: r.name, min_sales: Number(r.min_sales), commission_percent: Number(r.commission_percent),
      customer_discount_percent: Number(r.customer_discount_percent), sort_order: Number(r.sort_order), is_active: r.is_active,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
  };

  const add = async () => {
    const { error } = await (supabase as any).from("reseller_tiers").insert({
      name: "Nuevo nivel", min_sales: 0, commission_percent: 5, customer_discount_percent: 0, sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("¿Eliminar nivel?")) return;
    const { error } = await (supabase as any).from("reseller_tiers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Niveles de comisión</h1>
          <p className="text-sm text-muted-foreground">Configura umbrales, comisiones y descuentos al cliente.</p>
        </div>
        <Button onClick={add}><Plus size={16} /> Nuevo nivel</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th>Umbral ventas</th><th>% Comisión</th><th>% Descuento cliente</th><th>Orden</th><th>Activo</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2"><Input value={r.name} onChange={(e) => update(r.id, "name", e.target.value)} /></td>
                <td className="p-2"><Input type="number" value={r.min_sales} onChange={(e) => update(r.id, "min_sales", e.target.value)} className="w-28" /></td>
                <td className="p-2"><Input type="number" step="0.01" value={r.commission_percent} onChange={(e) => update(r.id, "commission_percent", e.target.value)} className="w-24" /></td>
                <td className="p-2"><Input type="number" step="0.01" value={r.customer_discount_percent} onChange={(e) => update(r.id, "customer_discount_percent", e.target.value)} className="w-24" /></td>
                <td className="p-2"><Input type="number" value={r.sort_order} onChange={(e) => update(r.id, "sort_order", e.target.value)} className="w-20" /></td>
                <td className="p-2"><Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, "is_active", v)} /></td>
                <td className="p-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => save(r)}><Save size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive ml-1"><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminResellerTiers;
