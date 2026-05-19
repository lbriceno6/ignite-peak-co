import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Rocket, TrendingUp, Users, ShieldCheck, Zap, BarChart3,
  Truck, Store, CheckCircle2, Sparkles, ArrowRight, Star,
} from "lucide-react";

const SellWithUs = () => {
  return (
    <Layout>
      <SEO
        title="Vende con nosotros — Marketplace de nutrición"
        description="Convierte tu marca en un best-seller. Acceso inmediato a miles de clientes, panel propio, pagos y envíos resueltos. Regístrate gratis."
      />

      {/* ============== ATTENTION ============== */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.25),transparent_55%)]" />
        <div className="container-x relative grid gap-10 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/5 px-3 py-1 text-xs uppercase tracking-widest text-accent">
              <Sparkles size={14} /> Marketplace abierto a marcas
            </span>
            <h1 className="mt-5 font-display text-5xl uppercase leading-[1.05] md:text-7xl">
              Tu marca <span className="text-accent">vende más</span> con nosotros
            </h1>
            <p className="mt-5 max-w-lg text-background/70 md:text-lg">
              Accede a miles de clientes ya activos, sin invertir en tráfico ni en plataforma. Crea tu cuenta, sube tus productos y empieza a facturar esta semana.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link to="/supplier/signup">Empezar a vender <ArrowRight size={16} /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground">
                <a href="#como-funciona">Ver cómo funciona</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-xs uppercase tracking-wider text-background/60">
              <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent" /> Registro gratis</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent" /> Comisión solo por venta</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent" /> Sin permanencia</span>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            {[
              { k: "+25k", v: "Clientes activos / mes" },
              { k: "+180", v: "Marcas confían" },
              { k: "48 h", v: "Activación de tu tienda" },
              { k: "15 %", v: "Comisión promedio" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur">
                <div className="font-display text-3xl text-accent md:text-4xl">{s.k}</div>
                <div className="mt-2 text-xs uppercase tracking-wider text-background/60">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== INTEREST ============== */}
      <section className="container-x py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">¿Por qué nosotros?</span>
          <h2 className="mt-2 font-display text-4xl uppercase md:text-5xl">Todo listo para que solo te ocupes de tu producto</h2>
          <p className="mt-4 text-muted-foreground">
            Nosotros ponemos la audiencia, la plataforma y la confianza. Tú pones el producto.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { Icon: Users, title: "Audiencia activa", text: "Aparece frente a una comunidad que ya compra suplementos y nutrición premium cada semana." },
            { Icon: Store, title: "Tu propia tienda", text: "Página /proveedor/tu-marca, badge 'Vendido por X' y panel para gestionar todo." },
            { Icon: Truck, title: "Logística y pagos", text: "Cobros con tarjeta, facturación automática y opciones de envío integradas." },
            { Icon: BarChart3, title: "Datos en tiempo real", text: "Dashboard con ventas, comisión, pedidos pendientes y stock." },
            { Icon: ShieldCheck, title: "Cero riesgo", text: "Sin cuota fija. Solo cobramos un % cuando tú facturas." },
            { Icon: Zap, title: "Publicación al instante", text: "Modo directo o revisión por admin: tú eliges cómo gestionar tu catálogo." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={20} /></div>
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== DESIRE ============== */}
      <section id="como-funciona" className="bg-muted/40 py-20">
        <div className="container-x grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Cómo funciona</span>
            <h2 className="mt-2 font-display text-4xl uppercase md:text-5xl">De cero a vendiendo en 4 pasos</h2>
            <ol className="mt-8 space-y-6">
              {[
                { t: "Regístrate gratis", d: "Crea tu cuenta de proveedor en 2 minutos." },
                { t: "Aprobación rápida", d: "Revisamos tu marca y te activamos en menos de 48 h." },
                { t: "Sube tus productos", d: "Imágenes, precios, stock y descripciones desde tu panel." },
                { t: "Empieza a cobrar", d: "Recibe pedidos, gestiona envíos y revisa tu comisión en tiempo real." },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground font-display text-background">{i + 1}</div>
                  <div>
                    <div className="font-display text-lg">{s.t}</div>
                    <div className="text-sm text-muted-foreground">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border bg-card p-8 shadow-lg">
            <div className="flex items-center gap-2 text-accent">
              <TrendingUp size={18} /> <span className="text-xs font-semibold uppercase tracking-wider">Lo que dicen nuestras marcas</span>
            </div>
            <div className="mt-4 flex gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <blockquote className="mt-4 font-display text-2xl leading-snug">
              "En el primer mes triplicamos lo que vendíamos por nuestra web. El panel es directo y el equipo responde rápido."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground font-display text-background">M</div>
              <div>
                <div className="text-sm font-semibold">María L.</div>
                <div className="text-xs text-muted-foreground">Fundadora · Marca de proteína vegetal</div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t pt-6">
              {[
                { k: "x3", v: "Ventas mes 1" },
                { k: "0€", v: "Coste fijo" },
                { k: "24h", v: "Soporte" },
              ].map((s) => (
                <div key={s.k} className="text-center">
                  <div className="font-display text-2xl">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== ACTION ============== */}
      <section className="container-x py-20">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,hsl(var(--accent)/0.35),transparent_55%)]" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr,1fr]">
            <div>
              <Rocket className="text-accent" />
              <h2 className="mt-3 font-display text-4xl uppercase leading-tight md:text-5xl">
                Lanza tu marca <span className="text-accent">esta semana</span>
              </h2>
              <p className="mt-3 max-w-xl text-background/70">
                Tu primer pedido puede entrar mañana. Activación gratis, sin permanencia, comisión solo por venta.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild variant="accent" size="lg" className="w-full md:w-auto">
                <Link to="/supplier/signup">Crear mi cuenta de proveedor <ArrowRight size={16} /></Link>
              </Button>
              <Link to="/auth" className="text-xs text-background/60 hover:text-accent">
                Ya tengo cuenta · Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SellWithUs;
