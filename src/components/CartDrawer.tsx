import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag, Repeat, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, cartTotals, lineSubtotal } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { usePromotions } from "@/hooks/usePromotions";
import { computePromotions } from "@/lib/promotions";

export const CartDrawer = () => {
  const { items, isOpen, setOpen, remove, setQty } = useCart();
  const { subtotal, shipping, total: rawTotal, count } = cartTotals(items);
  const { promotions } = usePromotions();
  const { totalDiscount: promoDiscount, applied: appliedPromos } = computePromotions(items, promotions);
  const total = Math.max(0, rawTotal - promoDiscount);
  const { format } = useCurrency();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <ShoppingBag size={20} /> Tu carrito ({count})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary">
              <ShoppingBag className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-xl">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-muted-foreground">Encuentra algo para potenciar tus objetivos.</p>
            </div>
            <Button variant="dark" onClick={() => setOpen(false)} asChild>
              <Link to="/categoria/protein">Empezar a comprar</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((item) => (
                <div key={item.product.id + (item.flavor ?? "") + (item.size ?? "")} className="flex gap-3">
                  <img src={item.product.image} alt={item.product.name} className="h-20 w-20 rounded-md object-cover bg-secondary" />
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium leading-tight">{item.product.name}</p>
                      <button onClick={() => remove(item.product.id)} aria-label="Eliminar">
                        <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[item.flavor, item.size].filter(Boolean).join(" · ") || item.product.category}
                    </p>
                    {item.subscription && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        <Repeat size={10} /> Cada {item.subscription.intervalDays}d · −{item.subscription.discountPercent}%
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button className="p-1.5 hover:bg-secondary" onClick={() => setQty(item.product.id, item.quantity - 1)} aria-label="Disminuir">
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button className="p-1.5 hover:bg-secondary" onClick={() => setQty(item.product.id, item.quantity + 1)} aria-label="Aumentar">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-display">{format(lineSubtotal(item))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t bg-secondary/40 p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{format(subtotal)}</span>
              </div>
              {appliedPromos.map((ap) => (
                <div key={ap.promotionId} className="flex justify-between text-sm text-accent">
                  <span className="inline-flex items-center gap-1"><Sparkles size={12} /> {ap.label}</span>
                  <span className="font-medium">−{format(ap.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className="font-medium">{shipping === 0 ? "Gratis" : format(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-display text-lg">
                <span>Total</span>
                <span>{format(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" asChild onClick={() => setOpen(false)}>
                  <Link to="/cart">Ver carrito</Link>
                </Button>
                <Button variant="accent" asChild onClick={() => setOpen(false)}>
                  <Link to="/checkout">Pagar</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
