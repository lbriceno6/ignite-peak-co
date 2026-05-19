import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useReseller } from "@/hooks/useReseller";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<string, string> = {
  requested: "Solicitado", approved: "Aprobado", paid: "Pagado", rejected: "Rechazado",
};

const ResellerPayouts = () => {
  const { reseller, refresh } = useReseller();
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "credit">("cash");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!reseller) return;
    const { data } = await (supabase as any).from("reseller_payouts").select("*").eq("reseller_id", reseller.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [reseller]);

  const request = async () => {
    if (!reseller) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Monto inválido");
    if (amt > reseller.balance_cash) return toast.error("Monto mayor a tu balance");
    setSubmitting(true);
    const { error } = await (supabase as any).from("reseller_payouts").insert({
      reseller_id: reseller.id, amount: amt, method, status: "requested",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitud enviada. El admin la revisará pronto.");
    setAmount("");
    load();
    refresh();
  };

  if (!reseller) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl uppercase">Pagos</h1>
        <p className="text-sm text-muted-foreground">Solicita el retiro de tus comisiones acumuladas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase text-muted-foreground">Disponible para retirar</p>
          <p className="mt-2 font-display text-3xl">{format(reseller.balance_cash)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase text-muted-foreground">Saldo en tienda</p>
          <p className="mt-2 font-display text-3xl">{format(reseller.balance_credit)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Lo usas automáticamente al pagar.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-display text-xl uppercase">Solicitar retiro</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label>Monto</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Método</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="cash">Efectivo / Banco</option>
              <option value="credit">Convertir a saldo en tienda</option>
            </select>
          </div>
          <Button variant="accent" onClick={request} disabled={submitting}>Solicitar</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Fecha</th><th>Monto</th><th>Método</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="font-semibold">{format(r.amount)}</td>
                <td>{r.method === "cash" ? "Efectivo" : "Saldo"}</td>
                <td><Badge variant={r.status === "paid" ? "default" : "secondary"}>{STATUS[r.status]}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sin solicitudes.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResellerPayouts;
