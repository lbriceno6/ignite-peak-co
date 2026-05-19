import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowLeft, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useReseller } from "@/hooks/useReseller";
import { useCurrency } from "@/context/CurrencyContext";

type CreditOrder = {
  id: string;
  order_code: string;
  created_at: string;
  total: number;
  store_credit_used: number;
};

const MyStoreCredit = () => {
  const { user } = useAuth();
  const { reseller } = useReseller();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, created_at, total, store_credit_used")
        .eq("user_id", user.id)
        .gt("store_credit_used", 0)
        .order("created_at", { ascending: false });
      setOrders((data as CreditOrder[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const currentBalance = reseller?.balance_credit ?? 0;
  // Reconstruct running balance backwards: current + sum of consumed after each row.
  const totalUsed = orders.reduce((s, o) => s + Number(o.store_credit_used ?? 0), 0);
  let runningAfter = currentBalance;
  const rowsWithBalance = orders.map((o) => {
    const after = runningAfter;
    const before = after + Number(o.store_credit_used ?? 0);
    runningAfter = before;
    return { ...o, balance_before: before, balance_after: after };
  });

  return (
    <Layout>
      <div className="container-x py-10 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/my-profile"><ArrowLeft size={14}/> Mi perfil</Link>
        </Button>

        <h1 className="font-display text-4xl uppercase">Saldo en tienda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial de cómo se ha consumido tu saldo en cada pedido.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Wallet size={14}/> Saldo disponible</div>
            <div className="mt-2 font-display text-3xl">{format(currentBalance)}</div>
          </div>
          <div className="rounded-lg border p-5">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Receipt size={14}/> Total usado</div>
            <div className="mt-2 font-display text-3xl">{format(totalUsed)}</div>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Pedido</th>
                <th className="p-3 text-right">Saldo antes</th>
                <th className="p-3 text-right">Usado</th>
                <th className="p-3 text-right">Saldo después</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando…</td></tr>}
              {!loading && rowsWithBalance.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aún no has usado saldo en tienda.</td></tr>
              )}
              {rowsWithBalance.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><Link to={`/my-orders/${o.id}`} className="font-mono text-xs hover:text-accent">{o.order_code}</Link></td>
                  <td className="p-3 text-right">{format(o.balance_before)}</td>
                  <td className="p-3 text-right font-semibold text-accent">−{format(o.store_credit_used)}</td>
                  <td className="p-3 text-right">{format(o.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default MyStoreCredit;
