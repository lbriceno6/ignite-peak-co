import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, Repeat, Check, X, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, cartTotals, lineSubtotal, lineUnitPrice } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { useShippingSettings } from "@/hooks/useShippingSettings";
import { applyReferralCode, clearReferral, getStoredReferral, StoredReferral } from "@/components/ReferralTracker";
import { usePromotions } from "@/hooks/usePromotions";
import { computePromotions, pendingPromoNudges, perProductPromoBreakdown } from "@/lib/promotions";
import { FreeShippingBar } from "@/components/FreeShippingBar";

const Cart = () => {
  const { items, remove, setQty } = useCart();
  useShippingSettings();
  const { subtotal: rawSubtotal, shipping, total: rawTotal } = cartTotals(items);
  const { format } = useCurrency();
  const [referral, setReferral] = useState<StoredReferral | null>(null);
  const [codeInput, setCodeInput] = useState("");
  useEffect(() => { setReferral(getStoredReferral()); }, []);
  const { promotions } = usePromotions();
  const { totalDiscount: promoDiscount, applied: appliedPromos } = computePromotions(items, promotions);
  const promoNudges = pendingPromoNudges(items, promotions);
  const perProduct = perProductPromoBreakdown(items, promotions);
  const discount = referral ? Math.round(rawSubtotal * referral.customer_discount_percent) / 100 : 0;
  const subtotal = rawSubtotal - discount - promoDiscount;
  const total = rawTotal - discount - promoDiscount;

  const apply = async () => {
    const r = await applyReferralCode(codeInput);
    if (!r) return toast.error("Código no válido");
    setReferral(r); setCodeInput("");
    toast.success(`¡${r.customer_discount_percent}% de descuento aplicado!`);
  };
  const clear = () => { clearReferral(); setReferral(null); toast.message("Código removido"); };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container-x py-24 text-center">
          <ShoppingBag className="mx-auto text-muted-foreground" size={48} />
          <h1 className="mt-4 font-display text-4xl uppercase">Tu carrito está vacío</h1>
          <p className="mt-2 text-muted-foreground">Es hora de potenciar tus objetivos.</p>
          <Button size="lg" variant="accent" className="mt-6" asChild>
            <Link to="/">Seguir comprando</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-x py-10">
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Tu carrito</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border">
            <div className="hidden grid-cols-[1fr_120px_120px_60px] gap-4 border-b bg-secondary/40 p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Producto</span><span>Cantidad</span><span className="text-right">Subtotal</span><span></span>
            </div>
            {items.map((i) => (
              <div key={i.product.id + (i.flavor ?? "") + (i.size ?? "")} className="grid items-center gap-4 border-b p-4 last:border-0 md:grid-cols-[1fr_120px_120px_60px]">
                <div className="flex gap-4">
                  <img src={i.product.image} alt={i.product.name} className="h-20 w-20 rounded bg-secondary object-cover" />
                  <div>
                    <Link to={`/producto/${i.product.slug}`} className="font-semibold hover:text-accent">{i.product.name}</Link>
                    <p className="text-xs text-muted-foreground">{[i.flavor, i.size].filter(Boolean).join(" · ")}</p>
                    {i.subscription && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        <Repeat size={10} /> Cada {i.subscription.intervalDays}d · −{i.subscription.discountPercent}%
                      </p>
                    )}
                    {perProduct[i.product.id]?.participating && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        <Sparkles size={10} /> {perProduct[i.product.id].label}
                        {perProduct[i.product.id].discountAmount > 0 && (
                          <span className="normal-case">· −{format(perProduct[i.product.id].discountAmount)} aplicado</span>
                        )}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium md:hidden">{format(lineUnitPrice(i))}</p>
                  </div>
                </div>
                <div className="flex items-center rounded-md border w-fit">
                  <button onClick={() => setQty(i.product.id, i.quantity - 1)} className="p-2 hover:bg-secondary"><Minus size={12} /></button>
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  <button onClick={() => setQty(i.product.id, i.quantity + 1)} className="p-2 hover:bg-secondary"><Plus size={12} /></button>
                </div>
                <span className="text-right font-display text-lg">{format(lineSubtotal(i))}</span>
                <button onClick={() => remove(i.product.id)} className="justify-self-end text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <FreeShippingBar subtotal={Math.max(0, subtotal)} variant="full" surface="cart" />
            <div className="rounded-lg border p-5">
              <h3 className="font-display text-xl uppercase">Resumen del pedido</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{format(rawSubtotal)}</span></div>
                {referral && discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span className="inline-flex items-center gap-1"><Tag size={12} /> Descuento revendedor ({referral.customer_discount_percent}%)</span>
                    <span className="font-semibold">−{format(discount)}</span>
                  </div>
                )}
                {appliedPromos.map((ap) => (
                  <div key={ap.promotionId} className="flex justify-between text-accent">
                    <span className="inline-flex items-center gap-1"><Sparkles size={12} /> {ap.label} · {ap.name}</span>
                    <span className="font-semibold">−{format(ap.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span className="font-semibold">{shipping === 0 ? "Gratis" : format(shipping)}</span></div>
                {shipping === 0 && <p className="text-xs text-success">🎉 Calificas para envío gratis</p>}
                {appliedPromos.length > 0 && (
                  <p className="rounded-md bg-accent/10 p-2 text-xs text-accent">{appliedPromos[0].message}</p>
                )}
                {appliedPromos.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    El descuento se aplica solo a productos participantes y sobre el producto de menor precio.
                  </p>
                )}
                {promoNudges.map((n) => (
                  <div key={n.promotion.id} className="rounded-md border border-accent/40 bg-accent/5 p-2 text-xs">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Agrega otro producto participante de la promoción para obtener el beneficio.
                    </p>
                    <Link
                      to="/promociones/compra-uno-lleva-otro"
                      className="mt-1 inline-block font-semibold text-accent hover:underline"
                    >
                      Ver productos participantes →
                    </Link>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t pt-4 font-display text-2xl">
                <span>Total</span><span>{format(total)}</span>
              </div>
              <Button size="lg" variant="accent" className="mt-5 w-full" asChild>
                <Link to="/checkout">Pagar <ArrowRight /></Link>
              </Button>
            </div>
            <div className="rounded-lg border p-5">
              <p className="flex items-center gap-2 text-sm font-bold"><Tag size={14} className="text-accent" /> Código de revendedor</p>
              {referral ? (
                <div className="mt-3 flex items-center justify-between rounded-md border border-accent/30 bg-accent/10 p-3">
                  <div className="text-sm">
                    <p className="font-bold inline-flex items-center gap-1"><Check size={14} className="text-accent" /> {referral.code ?? "Link aplicado"}</p>
                    <p className="text-xs text-muted-foreground">−{referral.customer_discount_percent}% en tu compra</p>
                  </div>
                  <button onClick={clear} className="text-muted-foreground hover:text-destructive" aria-label="Quitar código"><X size={16} /></button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="Ingresa el código" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} />
                  <Button variant="dark" onClick={apply} disabled={!codeInput.trim()}>Aplicar</Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
