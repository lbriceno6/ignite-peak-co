import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminResellers = () => {
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const [{ data: r }, { data: t }] = await Promise.all([
      (supabase as any).from("resellers").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("reseller_tiers").select("*").order("sort_order"),
    ]);
    setRows(r ?? []);
    setTiers(t ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, val: boolean) => {
    const { error } = await (supabase as any).from("resellers").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = rows.filter((r) => !q || r.code.toLowerCase().includes(q.toLowerCase()) || r.link_slug.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Revendedores</h1>
          <p className="text-sm text-muted-foreground">{rows.length} activos</p>
        </div>
        <Input placeholder="Buscar por código o link" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Código</th><th>Nivel</th><th>Ventas</th><th>Comisión total</th><th>Balance efectivo</th><th>Saldo tienda</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tier = tiers.find((t) => t.id === r.tier_id);
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono font-bold">{r.code}</td>
                  <td>{tier?.name ?? "—"}</td>
                  <td>{format(r.total_sales)}</td>
                  <td>{format(r.total_commission)}</td>
                  <td className="font-semibold">{format(r.balance_cash)}</td>
                  <td>{format(r.balance_credit)}</td>
                  <td><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Activo" : "Inactivo"}</Badge></td>
                  <td><Button size="sm" variant="outline" onClick={() => toggleActive(r.id, !r.is_active)}>{r.is_active ? "Desactivar" : "Activar"}</Button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sin revendedores.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminResellers;
