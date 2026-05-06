import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, cartTotals } from "@/store/cart";

const Cart = () => {
  const { items, remove, setQty } = useCart();
  const { subtotal, shipping, total } = cartTotals(items);

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container-x py-24 text-center">
          <ShoppingBag className="mx-auto text-muted-foreground" size={48} />
          <h1 className="mt-4 font-display text-4xl uppercase">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Time to fuel your goals.</p>
          <Button size="lg" variant="accent" className="mt-6" asChild>
            <Link to="/">Continue shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-x py-10">
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Your cart</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border">
            <div className="hidden grid-cols-[1fr_120px_120px_60px] gap-4 border-b bg-secondary/40 p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Product</span><span>Quantity</span><span className="text-right">Subtotal</span><span></span>
            </div>
            {items.map((i) => (
              <div key={i.product.id + (i.flavor ?? "") + (i.size ?? "")} className="grid items-center gap-4 border-b p-4 last:border-0 md:grid-cols-[1fr_120px_120px_60px]">
                <div className="flex gap-4">
                  <img src={i.product.image} alt={i.product.name} className="h-20 w-20 rounded bg-secondary object-cover" />
                  <div>
                    <Link to={`/product/${i.product.slug}`} className="font-semibold hover:text-accent">{i.product.name}</Link>
                    <p className="text-xs text-muted-foreground">{[i.flavor, i.size].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-sm font-medium md:hidden">€{i.product.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center rounded-md border w-fit">
                  <button onClick={() => setQty(i.product.id, i.quantity - 1)} className="p-2 hover:bg-secondary"><Minus size={12} /></button>
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  <button onClick={() => setQty(i.product.id, i.quantity + 1)} className="p-2 hover:bg-secondary"><Plus size={12} /></button>
                </div>
                <span className="text-right font-display text-lg">€{(i.product.price * i.quantity).toFixed(2)}</span>
                <button onClick={() => remove(i.product.id)} className="justify-self-end text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border p-5">
              <h3 className="font-display text-xl uppercase">Order summary</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">€{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{shipping === 0 ? "Free" : `€${shipping.toFixed(2)}`}</span></div>
                {shipping === 0 && <p className="text-xs text-success">🎉 You qualify for free shipping</p>}
              </div>
              <div className="mt-4 flex justify-between border-t pt-4 font-display text-2xl">
                <span>Total</span><span>€{total.toFixed(2)}</span>
              </div>
              <Button size="lg" variant="accent" className="mt-5 w-full" asChild>
                <Link to="/checkout">Checkout <ArrowRight /></Link>
              </Button>
            </div>
            <div className="rounded-lg border p-5">
              <p className="flex items-center gap-2 text-sm font-bold"><Tag size={14} className="text-accent" /> Have a promo code?</p>
              <div className="mt-3 flex gap-2">
                <Input placeholder="Enter code" />
                <Button variant="dark">Apply</Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
