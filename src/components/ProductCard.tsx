import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stars } from "./Stars";
import { useCart } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/data/catalog";
import { cn } from "@/lib/utils";

const labelClass = (label?: string) => {
  switch (label) {
    case "Best Seller": return "bg-accent text-accent-foreground";
    case "New": return "bg-foreground text-background";
    case "Offer": return "bg-destructive text-destructive-foreground";
    default: return "bg-muted text-foreground";
  }
};

const labelText = (label?: string) => {
  switch (label) {
    case "Best Seller": return "Más vendido";
    case "New": return "Nuevo";
    case "Offer": return "Oferta";
    default: return label;
  }
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { add, toggleWish, wishlist } = useCart();
  const { format } = useCurrency();
  const wished = wishlist.includes(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-smooth hover:shadow-elevated hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <Link to={`/producto/${product.slug}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.label && (
            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider", labelClass(product.label))}>
              {labelText(product.label)}
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] font-bold">
              -{discount}%
            </Badge>
          )}
        </div>
        <button
          onClick={() => toggleWish(product.id)}
          aria-label="Añadir a favoritos"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur transition-smooth hover:bg-accent hover:text-accent-foreground"
        >
          <Heart size={16} className={wished ? "fill-accent text-accent" : ""} />
        </button>
        <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition-smooth group-hover:translate-y-0 group-hover:opacity-100">
          <Button size="sm" variant="secondary" asChild className="flex-1">
            <Link to={`/producto/${product.slug}`}>
              <Eye size={14} /> Ver
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.category}</div>
        <Link to={`/producto/${product.slug}`} className="font-display text-lg leading-tight hover:text-accent transition-smooth">
          {product.name}
        </Link>
        {product.supplier?.slug && (
          <Link
            to={`/proveedor/${product.supplier.slug}`}
            className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent"
          >
            Vendido por <span className="font-semibold text-foreground">{product.supplier.business_name}</span>
          </Link>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">{product.shortBenefit}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Stars rating={product.rating} />
          <span>({product.reviews})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {product.oldPrice ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Precio de oferta</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl">{format(product.price)}</span>
                  <span className="text-sm text-muted-foreground line-through">{format(product.oldPrice)}</span>
                </div>
              </>
            ) : (
              <span className="font-display text-2xl">{format(product.price)}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="accent"
            onClick={() => add(product)}
            aria-label={`Añadir ${product.name} al carrito`}
          >
            <ShoppingCart size={14} />
          </Button>
        </div>
      </div>
    </article>
  );
};
