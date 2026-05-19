import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trophy, Link2, Tag, Wallet } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useReseller, ResellerTier } from "@/hooks/useReseller";
import { useCurrency } from "@/context/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";

const ResellerProgram = () => {
  const { user } = useAuth();
  const { reseller, activate } = useReseller();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<ResellerTier[]>([]);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("reseller_tiers").select("*").eq("is_active", true).order("sort_order");
      setTiers(data ?? []);
    })();
  }, []);

  const handleActivate = async () => {
    if (!user) return navigate("/auth", { state: { from: "/programa-revendedor" } });
    setActivating(true);
    try {
      await activate();
      toast.success("¡Plan activado! Bienvenido al programa.");
      navigate("/reseller");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo activar");
    } finally { setActivating(false); }
  };

  return (
    <Layout>
      <section className="bg-gradient-to-br from-accent/10 to-transparent py-20">
        <div className="container-x text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Programa revendedor</p>
          <h1 className="mt-3 font-display text-5xl uppercase">Gana revendiendo nuestros productos</h1>
          <p className="mt-4 text-lg text-muted-foreground">Comparte tu link o código y obtén comisión por cada venta. Sin inventario, sin riesgo, con pagos a tu elección.</p>
          {reseller ? (
            <Button asChild size="xl" variant="accent" className="mt-8"><Link to="/reseller">Ir a mi panel</Link></Button>
          ) : (
            <Button size="xl" variant="accent" className="mt-8" onClick={handleActivate} disabled={activating}>
              {activating ? "Activando…" : "Activar mi plan gratis"}
            </Button>
          )}
        </div>
      </section>

      <section className="container-x py-16">
        <h2 className="font-display text-3xl uppercase text-center">Cómo funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            { i: Trophy, t: "1. Activa tu plan", d: "Click en activar y obtienes tu código y link únicos." },
            { i: Link2, t: "2. Comparte", d: "Envía tu link a amigos, redes o usa tu código." },
            { i: Tag, t: "3. Tu cliente compra", d: "Recibe descuento usando tu código y tú ganas comisión." },
            { i: Wallet, t: "4. Cobra tu dinero", d: "Solicita pago en efectivo o úsalo como saldo en tienda." },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border bg-card p-6">
              <s.i className="text-accent" />
              <h3 className="mt-3 font-display text-lg">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-16">
        <h2 className="font-display text-3xl uppercase text-center">Niveles de comisión</h2>
        <p className="mt-2 text-center text-muted-foreground">A más ventas, más ganas. Subes de nivel automáticamente.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t, idx) => (
            <div key={t.id} className={`rounded-xl border-2 p-6 ${idx === 1 ? "border-accent bg-accent/5" : "bg-card"}`}>
              <p className="text-xs uppercase text-muted-foreground">Nivel</p>
              <h3 className="font-display text-3xl">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Desde {format(t.min_sales)} en ventas</p>
              <div className="mt-6 space-y-2">
                <p className="font-display text-4xl text-accent">{t.commission_percent}%</p>
                <p className="text-sm text-muted-foreground">de comisión por venta</p>
                <p className="text-sm">+ <span className="font-semibold">{t.customer_discount_percent}%</span> de descuento para tu cliente</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          {reseller ? (
            <Button asChild size="lg" variant="accent"><Link to="/reseller">Ir a mi panel</Link></Button>
          ) : (
            <Button size="lg" variant="accent" onClick={handleActivate} disabled={activating}>Activar ahora — gratis</Button>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ResellerProgram;
