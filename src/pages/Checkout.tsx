import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Check, CreditCard, Truck, Smartphone, Landmark, Banknote, MessageCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, cartTotals, lineSubtotal } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { useSiteContent } from "@/hooks/useSiteContent";

const Step = ({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2">
    <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? "bg-accent text-accent-foreground" : active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
      {done ? <Check size={14} /> : num}
    </span>
    <span className={`text-sm font-semibold uppercase tracking-wider ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

const PAY_KEYS = [
  "pay.order",
  "pay.yape.enabled","pay.yape.holder","pay.yape.phone","pay.yape.qr_url","pay.yape.note",
  "pay.plin.enabled","pay.plin.holder","pay.plin.phone","pay.plin.qr_url","pay.plin.note",
  "pay.bank.enabled","pay.bank.bank_name","pay.bank.account_type","pay.bank.account_number",
  "pay.bank.cci","pay.bank.holder","pay.bank.document","pay.bank.note",
  "pay.card.enabled","pay.card.provider","pay.card.brands","pay.card.note",
  "pay.cod.enabled","pay.cod.note","pay.confirm_whatsapp",
];

const METHOD_META: Record<string, { l: string; icon: any }> = {
  yape: { l: "Yape", icon: Smartphone },
  plin: { l: "Plin", icon: Smartphone },
  bank: { l: "Transferencia / Depósito", icon: Landmark },
  cod: { l: "Pago contra entrega", icon: Banknote },
  card: { l: "Tarjeta", icon: CreditCard },
};
const DEFAULT_ORDER = ["yape", "plin", "bank", "cod", "card"];

const Checkout = () => {
  const { items } = useCart();
  const { subtotal, shipping, total } = cartTotals(items);
  const { format } = useCurrency();
  const { content: pay } = useSiteContent(PAY_KEYS, { "pay.card.enabled": "1" });
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<string>("");

  const methods = useMemo(() => {
    const stored = (pay["pay.order"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const order = [...stored];
    DEFAULT_ORDER.forEach((id) => { if (!order.includes(id)) order.push(id); });
    return order
      .filter((id) => METHOD_META[id] && pay[`pay.${id}.enabled`] === "1")
      .map((id) => ({ k: id, l: METHOD_META[id].l, icon: METHOD_META[id].icon }));
  }, [pay]);

  const selected = method || methods[0]?.k || "card";
  const wa = (pay["pay.confirm_whatsapp"] || "").replace(/[^0-9]/g, "");
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`¡Hola! Acabo de realizar un pago por ${format(total)} con ${selected.toUpperCase()}. Te envío el comprobante.`)}` : "";


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
              <RadioGroup value={selected} onValueChange={setMethod} className="mt-4 space-y-2">
                {methods.map((m) => (
                  <label key={m.k} className="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-secondary/40">
                    <RadioGroupItem value={m.k} />
                    <m.icon size={18} className="text-muted-foreground" />
                    <span className="font-medium">{m.l}</span>
                  </label>
                ))}
              </RadioGroup>

              {selected === "card" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Número de tarjeta</Label><Input placeholder="1234 5678 9012 3456" className="mt-1.5" /></div>
                  <div><Label>Vencimiento</Label><Input placeholder="MM/AA" className="mt-1.5" /></div>
                  <div><Label>CVC</Label><Input placeholder="123" className="mt-1.5" /></div>
                </div>
              )}

              {(selected === "yape" || selected === "plin") && (() => {
                const p = selected === "yape" ? "pay.yape" : "pay.plin";
                const name = selected === "yape" ? "Yape" : "Plin";
                return (
                  <div className="mt-4 rounded-md border bg-secondary/40 p-4 text-sm space-y-2">
                    <p className="font-semibold">Paga con {name}</p>
                    {pay[`${p}.holder`] && <p><span className="text-muted-foreground">Titular:</span> {pay[`${p}.holder`]}</p>}
                    {pay[`${p}.phone`] && <p><span className="text-muted-foreground">Celular:</span> <span className="font-mono font-semibold">{pay[`${p}.phone`]}</span></p>}
                    <p><span className="text-muted-foreground">Monto:</span> <span className="font-display text-base">{format(total)}</span></p>
                    {pay[`${p}.qr_url`] && (
                      <img src={pay[`${p}.qr_url`]} alt={`QR ${name}`} className="mt-2 h-40 w-40 rounded border bg-white object-contain p-2" />
                    )}
                    {pay[`${p}.note`] && <p className="whitespace-pre-line text-muted-foreground">{pay[`${p}.note`]}</p>}
                    {waLink && (
                      <Button asChild variant="dark" className="mt-2 w-full">
                        <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Enviar comprobante por WhatsApp</a>
                      </Button>
                    )}
                  </div>
                );
              })()}

              {selected === "bank" && (
                <div className="mt-4 rounded-md border bg-secondary/40 p-4 text-sm space-y-1.5">
                  <p className="font-semibold">Transferencia / Depósito bancario</p>
                  {pay["pay.bank.bank_name"] && <p><span className="text-muted-foreground">Banco:</span> {pay["pay.bank.bank_name"]}</p>}
                  {pay["pay.bank.account_type"] && <p><span className="text-muted-foreground">Tipo:</span> {pay["pay.bank.account_type"]}</p>}
                  {pay["pay.bank.account_number"] && <p><span className="text-muted-foreground">N° de cuenta:</span> <span className="font-mono font-semibold">{pay["pay.bank.account_number"]}</span></p>}
                  {pay["pay.bank.cci"] && <p><span className="text-muted-foreground">CCI:</span> <span className="font-mono font-semibold">{pay["pay.bank.cci"]}</span></p>}
                  {pay["pay.bank.holder"] && <p><span className="text-muted-foreground">Titular:</span> {pay["pay.bank.holder"]}</p>}
                  {pay["pay.bank.document"] && <p><span className="text-muted-foreground">DNI/RUC:</span> {pay["pay.bank.document"]}</p>}
                  <p><span className="text-muted-foreground">Monto:</span> <span className="font-display text-base">{format(total)}</span></p>
                  {pay["pay.bank.note"] && <p className="mt-2 whitespace-pre-line text-muted-foreground">{pay["pay.bank.note"]}</p>}
                  {waLink && (
                    <Button asChild variant="dark" className="mt-3 w-full">
                      <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Enviar comprobante por WhatsApp</a>
                    </Button>
                  )}
                </div>
              )}

              {selected === "cod" && (
                <div className="mt-4 rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground whitespace-pre-line">
                  {pay["pay.cod.note"] || "Pagarás en efectivo al recibir tu pedido."}
                </div>
              )}
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
