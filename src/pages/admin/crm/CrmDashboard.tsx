import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import { INTEREST_LABEL } from "@/lib/crm";
import { Loader2, Users, Trophy, ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";

export default function CrmDashboard() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topInterests, setTopInterests] = useState<{ code: string; total: number }[]>([]);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: customers } = await (supabase as any).from("crm_customers").select("*");
    const list = (customers || []) as any[];
    const totalCustomers = list.length;
    const nuevos = list.filter((c) => c.estado === "nuevo").length;
    const recurrentes = list.filter((c) => c.estado === "recurrente").length;
    const vip = list.filter((c) => c.estado === "vip").length;
    const inactivos = list.filter((c) => c.estado === "inactivo").length;
    const pendientePago = list.filter((c) => c.estado === "pendiente_pago").length;
    const ventas = list.reduce((s, c) => s + Number(c.total_spent || 0), 0);
    const conPedidos = list.filter((c) => Number(c.total_orders || 0) > 0).length;
    const ventasPorCliente = conPedidos > 0 ? ventas / conPedidos : 0;

    const { data: carts } = await (supabase as any).from("crm_abandoned_carts_v").select("user_id");
    const totalCarritos = (carts || []).length;

    const { data: recovered } = await (supabase as any)
      .from("crm_abandoned_cart_status")
      .select("status");
    const recoveredCount = (recovered || []).filter((r: any) => r.status === "recuperado").length;
    const trackedCount = (recovered || []).length;
    const recoveryRate = trackedCount > 0 ? (recoveredCount / trackedCount) * 100 : 0;

    const { data: interests } = await (supabase as any)
      .from("crm_customer_interests")
      .select("interest_code")
      .eq("is_primary", true);
    const grouped = new Map<string, number>();
    (interests || []).forEach((r: any) => grouped.set(r.interest_code, (grouped.get(r.interest_code) || 0) + 1));
    const sorted = Array.from(grouped.entries())
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    setStats({
      totalCustomers,
      nuevos,
      recurrentes,
      vip,
      inactivos,
      pendientePago,
      ventas,
      ventasPorCliente,
      totalCarritos,
      recoveryRate,
    });
    setTopInterests(sorted);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    await (supabase as any).rpc("crm_recompute_interests");
    await load();
    setRecomputing(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM · Panel</h1>
          <p className="text-sm text-muted-foreground">Resumen comercial de Nutribatidos.</p>
        </div>
        <Button variant="outline" size="sm" onClick={recompute} disabled={recomputing}>
          {recomputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recalcular intereses
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Clientes" value={stats.totalCustomers} />
        <Stat icon={Users} label="Nuevos" value={stats.nuevos} />
        <Stat icon={Users} label="Recurrentes" value={stats.recurrentes} />
        <Stat icon={Trophy} label="VIP" value={stats.vip} />
        <Stat icon={ShoppingCart} label="Carritos abandonados" value={stats.totalCarritos} />
        <Stat icon={RefreshCw} label="% Recuperación" value={`${stats.recoveryRate.toFixed(0)}%`} />
        <Stat icon={AlertTriangle} label="Pendientes de pago" value={stats.pendientePago} />
        <Stat icon={Users} label="Inactivos" value={stats.inactivos} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ventas totales</span><span className="font-semibold">{format(stats.ventas)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Promedio por cliente</span><span className="font-semibold">{format(stats.ventasPorCliente)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intereses principales</CardTitle>
          </CardHeader>
          <CardContent>
            {topInterests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay intereses calculados.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {topInterests.map((i) => (
                  <li key={i.code} className="flex justify-between">
                    <span>{INTEREST_LABEL[i.code] || i.code}</span>
                    <span className="font-semibold">{i.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/admin/crm/clientes">Ver clientes</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/crm/carritos">Carritos abandonados</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/crm/plantillas">Plantillas</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/crm/segmentos">Segmentos</Link></Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
