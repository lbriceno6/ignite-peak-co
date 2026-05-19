import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Check, CreditCard, Truck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, cartTotals, lineSubtotal } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";

const Step = ({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2">
    <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? "bg-accent text-accent-foreground" : active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
      {done ? <Check size={14} /> : num}
    </span>
    <span className={`text-sm font-semibold uppercase tracking-wider ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

const Checkout = () => {
  const { items } = useCart();
  const { subtotal, shipping, total } = cartTotals(items);
  const { format } = useCurrency();
  const [step, setStep] = useState(1);

  return (
    <Layout>
      <div className="container-x py-10">
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Pagar</h1>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Step num={1} label="Información" active={step === 1} done={step > 1} />
          <span className="hidden h-px w-10 bg-border sm:block" />
          <Step num={2} label="Envío" active={step === 2} done={step > 2} />
          <span className="hidden h-px w-10 bg-border sm:block" />
          <Step num={3} label="Pago" active={step === 3} done={step > 3} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <section className="rounded-lg border p-6">
              <h3 className="font-display text-xl uppercase">Contacto</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><Label>Correo</Label><Input type="email" placeholder="tu@correo.com" className="mt-1.5" /></div>
                <div><Label>Teléfono</Label><Input type="tel" placeholder="+51 999 999 999" className="mt-1.5" /></div>
              </div>
            </section>

            <section className="rounded-lg border p-6">
              <h3 className="font-display text-xl uppercase">Dirección de envío</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><Label>Nombre</Label><Input className="mt-1.5" /></div>
                <div><Label>Apellido</Label><Input className="mt-1.5" /></div>
                <div className="sm:col-span-2"><Label>Dirección</Label><Input className="mt-1.5" /></div>
                <div><Label>Ciudad</Label><Input className="mt-1.5" /></div>
                <div><Label>Código postal</Label><Input className="mt-1.5" /></div>
                <div className="sm:col-span-2"><Label>País</Label><Input className="mt-1.5" defaultValue="Perú" /></div>
              </div>
            </section>

            <section className="rounded-lg border p-6">
              <h3 className="font-display text-xl uppercase flex items-center gap-2"><Truck size={18} /> Método de envío</h3>
              <RadioGroup defaultValue="standard" className="mt-4 space-y-2">
                {[
                  { v: "standard", t: "Envío estándar", d: "2–3 días hábiles", p: `Gratis sobre ${format(50)}` },
                  { v: "express", t: "Envío exprés", d: "Siguiente día hábil", p: format(7.9) },
                ].map((o) => (
                  <label key={o.v} className="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-secondary/40">
                    <RadioGroupItem value={o.v} />
                    <div className="flex-1">
                      <p className="font-semibold">{o.t}</p>
                      <p className="text-xs text-muted-foreground">{o.d}</p>
                    </div>
                    <span className="font-display">{o.p}</span>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="rounded-lg border p-6">
              <h3 className="font-display text-xl uppercase flex items-center gap-2"><CreditCard size={18} /> Pago</h3>
              <RadioGroup defaultValue="card" className="mt-4 space-y-2">
                {[{k:"card",l:"Tarjeta"},{k:"paypal",l:"PayPal"},{k:"apple",l:"Apple Pay"},{k:"bank",l:"Transferencia bancaria"}].map((m) => (
                  <label key={m.k} className="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-secondary/40">
                    <RadioGroupItem value={m.k} />
                    <span className="font-medium">{m.l}</span>
                  </label>
                ))}
              </RadioGroup>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Número de tarjeta</Label><Input placeholder="1234 5678 9012 3456" className="mt-1.5" /></div>
                <div><Label>Vencimiento</Label><Input placeholder="MM/AA" className="mt-1.5" /></div>
                <div><Label>CVC</Label><Input placeholder="123" className="mt-1.5" /></div>
              </div>
            </section>

            <Button size="xl" variant="accent" className="w-full" onClick={() => setStep(Math.min(3, step + 1))}>
              <Lock size={16} /> Pagar {format(total)} de forma segura
            </Button>
          </div>

          <aside className="rounded-lg border p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display text-xl uppercase">Tu pedido</h3>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product.id} className="flex items-center gap-3">
                  <div className="relative">
                    <img src={i.product.image} alt={i.product.name} className="h-14 w-14 rounded bg-secondary object-cover" />
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">{i.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium leading-tight">{i.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[i.flavor, i.size].filter(Boolean).join(" · ")}
                      {i.subscription && ` · 🔁 cada ${i.subscription.intervalDays}d (−${i.subscription.discountPercent}%)`}
                    </p>
                  </div>
                  <span className="font-semibold">{format(lineSubtotal(i))}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Tu carrito está vacío. <Link to="/" className="underline">Comprar ahora</Link></p>}
            </div>
            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{format(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span>{shipping === 0 ? "Gratis" : format(shipping)}</span></div>
              <div className="flex justify-between border-t pt-3 font-display text-xl"><span>Total</span><span>{format(total)}</span></div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
