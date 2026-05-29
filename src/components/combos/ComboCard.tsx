import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/store/cart";
import { trackComboEvent, type ComboRecommendation } from "@/lib/smartCombos";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

type Props = {
  recommendation: ComboRecommendation;
  location: string;
  compact?: boolean;
};

export function ComboCard({ recommendation, location, compact }: Props) {
  const { combo, products, savings, message, reason } = recommendation;
  const { addCombo } = useCart();
  const { format } = useCurrency();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          trackComboEvent(combo.id, "view", { sourceLocation: location });
          obs.disconnect();
        }
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [combo.id, location]);

  const onAdd = () => {
    const outOfStock = products.find((p) => (p.product?.stock ?? 0) < p.quantity);
    if (outOfStock) {
      toast.error("Algunos productos del combo no tienen stock.");
      return;
    }
    const productList = products
      .filter((p) => p.product)
      .map((p) => ({
        product: {
          id: p.product!.id,
          slug: p.product!.slug,
          name: p.product!.name,
          shortBenefit: "",
          price: Number(p.product!.sale_price ?? p.product!.price),
          rating: 0,
          reviews: 0,
          image: p.product!.main_image || "",
          category: "",
          goal: [],
          brand: "",
        },
        quantity: p.quantity,
      }));
    addCombo(
      { id: combo.id, name: combo.name, savings },
      productList,
    );
    trackComboEvent(combo.id, "cart_add", { sourceLocation: location, amount: combo.price_combo });
    toast.success(`${combo.name} agregado. Ahorras ${format(savings)}`);
  };

  return (
    <Card ref={rootRef} className="overflow-hidden">
      <div className={compact ? "flex gap-3 p-3" : "p-4"}>
        {combo.image_url && (
          <img
            src={combo.image_url}
            alt={combo.name}
            className={compact ? "h-20 w-20 rounded object-cover" : "mb-3 h-40 w-full rounded object-cover"}
            loading="lazy"
          />
        )}
        <div className="flex-1 space-y-1">
          <h4 className="font-display text-base">{combo.name}</h4>
          <p className="text-xs text-muted-foreground">
            Incluye: {products.map((p) => p.product?.name).filter(Boolean).join(" + ")}
          </p>
          {reason && <p className="text-xs italic text-muted-foreground">{reason}</p>}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-sm text-muted-foreground line-through">{format(combo.price_normal)}</span>
            <span className="font-display text-lg">{format(combo.price_combo)}</span>
            {savings > 0 && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
                Ahorras {format(savings)}
              </span>
            )}
          </div>
          <Button size="sm" variant="accent" className="mt-2 w-full" onClick={onAdd}>
            <ShoppingCart size={14} /> Agregar combo
          </Button>
        </div>
      </div>
      <p className="border-t bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        Como complemento nutricional. No reemplaza una alimentación balanceada.
      </p>
    </Card>
  );
}

export default ComboCard;
