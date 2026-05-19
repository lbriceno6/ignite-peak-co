import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<string, string> = {
  requested: "Solicitado", approved: "Aprobado", paid: "Pagado", rejected: "Rechazado",
};

const AdminResellerPayouts = () => {
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data: payouts } = await (supabase as any).from("reseller_payouts").select("*").order("created_at", { ascending: false });
    const { data: resellers } = await (supabase as any).from("resellers").select("id, code");
    const map = Object.fromEntries((resellers ?? []).map((r: any) => [r.id, r.code]));
    setRows((payouts ?? []).map((p: any) => ({ ...p, code: map[p.reseller_id] })));
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("reseller_payouts").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizado");
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl uppercase">Pagos a revendedores</h1>
        <p className="text-sm text-muted-foreground">Aprueba o marca como pagadas las solicitudes.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Fecha</th><th>Revendedor</th><th>Monto</th><th>Método</th><th>Estado</th><th>Notas</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="font-mono">{r.code}</td>
                <td className="font-semibold">{format(r.amount)}</td>
                <td>{r.method === "cash" ? "Efectivo" : "Saldo"}</td>
                <td><Badge variant={r.status === "paid" ? "default" : "secondary"}>{STATUS[r.status]}</Badge></td>
                <td className="text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="whitespace-nowrap">
                  {r.status === "requested" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "approved")}>Aprobar</Button>
                      <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => setStatus(r.id, "rejected")}>Rechazar</Button>
                    </>
                  )}
                  {(r.status === "approved" || r.status === "requested") && (
                    <Button size="sm" variant="accent" className="ml-1" onClick={() => setStatus(r.id, "paid")}>Marcar pagado</Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin solicitudes.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminResellerPayouts;
