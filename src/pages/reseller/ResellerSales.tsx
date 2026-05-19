import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReseller } from "@/hooks/useReseller";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobada", paid: "Pagada", cancelled: "Cancelada",
};

const ResellerSales = () => {
  const { reseller } = useReseller();
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!reseller) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("reseller_referrals")
        .select("id, source, subtotal, commission_percent, commission_amount, status, created_at, order_id")
        .eq("reseller_id", reseller.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [reseller]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl uppercase">Mis ventas</h1>
        <p className="text-sm text-muted-foreground">Aquí ves cada compra atribuida a tu link o código.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Fecha</th><th>Fuente</th><th>Subtotal</th><th>%</th><th>Comisión</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                <td><Badge variant="outline">{r.source === "code" ? "Código" : "Link"}</Badge></td>
                <td>{format(r.subtotal)}</td>
                <td>{r.commission_percent}%</td>
                <td className="font-semibold">{format(r.commission_amount)}</td>
                <td><Badge variant={r.status === "paid" ? "default" : "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aún no tienes ventas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResellerSales;
