import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, cartTotals } from "@/store/cart";

export const CartDrawer = () => {
  const { items, isOpen, setOpen, remove, setQty } = useCart();
  const { subtotal, shipping, total, count } = cartTotals(items);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <ShoppingBag size={20} /> Your cart ({count})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary">
              <ShoppingBag className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-xl">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Find something to fuel your goals.</p>
            </div>
            <Button variant="dark" onClick={() => setOpen(false)} asChild>
              <Link to="/category/protein">Start shopping</Link>
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
                      <button onClick={() => remove(item.product.id)} aria-label="Remove">
                        <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[item.flavor, item.size].filter(Boolean).join(" · ") || item.product.category}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button className="p-1.5 hover:bg-secondary" onClick={() => setQty(item.product.id, item.quantity - 1)} aria-label="Decrease">
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button className="p-1.5 hover:bg-secondary" onClick={() => setQty(item.product.id, item.quantity + 1)} aria-label="Increase">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-display">€{(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t bg-secondary/40 p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? "Free" : `€${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-display text-lg">
                <span>Total</span>
                <span>€{total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" asChild onClick={() => setOpen(false)}>
                  <Link to="/cart">View cart</Link>
                </Button>
                <Button variant="accent" asChild onClick={() => setOpen(false)}>
                  <Link to="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
