import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stars } from "./Stars";
import { useCart } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/data/catalog";
import { cn } from "@/lib/utils";

const WHATSAPP_BASE =
  "https://wa.me/51999999999?text=";

// Mapa de etiquetas comerciales (inglés legacy → español).
const labelMap: Record<string, string> = {
  "Best Seller": "Más vendido",
  "Best-Seller": "Más vendido",
  "BEST-SELLER": "Más vendido",
  "New": "Nuevo",
  "NEW": "Nuevo",
  "Offer": "Oferta",
  "OFFER": "Oferta",
  "SALE": "Oferta",
  "POPULAR": "Popular",
  "Popular": "Popular",
  "Recommended": "Recomendado",
  "Natural": "Natural",
  "Premium": "Premium",
  "Pack": "Pack ahorro",
};

// Mapa de categorías legacy en inglés → español.
const categoryMap: Record<string, string> = {
  "Protein": "Proteínas",
  "Creatine": "Creatina",
  "Pre-Workout": "Pre-entreno",
  "Vitamins": "Vitaminas",
  "Snacks": "Snacks saludables",
  "Accessories": "Accesorios",
  "Amino Acids": "Aminoácidos",
  "BCAA": "Aminoácidos",
};

const labelClass = (label?: string) => {
  const es = label ? (labelMap[label] ?? label) : "";
  switch (es) {
    case "Más vendido": return "bg-accent text-accent-foreground";
    case "Nuevo": return "bg-foreground text-background";
    case "Oferta": return "bg-destructive text-destructive-foreground";
    case "Recomendado": return "bg-primary text-primary-foreground";
    default: return "bg-muted text-foreground";
  }
};

const translateLabel = (label?: string) => (label ? (labelMap[label] ?? label) : undefined);
const translateCategory = (cat?: string) => (cat ? (categoryMap[cat] ?? cat) : "");

const trimBenefit = (s?: string, max = 90) => {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : max).trim() + "…";
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { add, toggleWish, wishlist } = useCart();
  const { format } = useCurrency();
  const wished = wishlist.includes(product.id);

  const hasPrice = Number(product.price) > 0;
  const discount = hasPrice && product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const benefit = trimBenefit(product.shortBenefit);
  const subcat = translateCategory((product as any).subcategory) || translateCategory(product.category);
  const labelEs = translateLabel(product.label);

  const waHref =
    WHATSAPP_BASE +
    encodeURIComponent(
      `¡Hola Nutribatidos! Quisiera consultar el precio de "${product.name}".`,
    );

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
          {labelEs && (
            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider", labelClass(product.label))}>
              {labelEs}
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
              <Eye size={14} /> Ver producto
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {subcat && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{subcat}</div>
        )}
        <Link
          to={`/producto/${product.slug}`}
          className="font-display text-lg leading-tight hover:text-accent transition-smooth"
        >
          {product.name}
        </Link>
        {benefit && (
          <p className="text-sm text-muted-foreground line-clamp-2">{benefit}</p>
        )}

        {product.supplier?.slug ? (
          <Link
            to={`/proveedor/${product.supplier.slug}`}
            className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent"
          >
            Vendido por <span className="font-semibold text-foreground">{product.supplier.business_name}</span>
          </Link>
        ) : null}

        {product.reviews > 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stars rating={product.rating} />
            <span>({product.reviews})</span>
          </div>
        ) : (
          <div className="text-xs font-medium text-muted-foreground">
            {labelEs === "Nuevo" ? "Nuevo producto" : "Recomendado"}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {!hasPrice ? (
              <span className="font-display text-lg text-muted-foreground">Consultar precio</span>
            ) : product.oldPrice ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Precio de oferta</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl">{format(product.price)}</span>
                  <span className="text-sm text-muted-foreground line-through">
                    Antes: {format(product.oldPrice)}
                  </span>
                </div>
              </>
            ) : (
              <span className="font-display text-2xl">{format(product.price)}</span>
            )}
          </div>
        </div>

        {hasPrice ? (
          <Button
            size="sm"
            variant="accent"
            className="mt-2 w-full"
            onClick={() => add(product)}
            aria-label={`Añadir ${product.name} al carrito`}
          >
            <ShoppingCart size={14} /> Agregar al carrito
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            asChild
            className="mt-2 w-full"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} /> Consultar por WhatsApp
            </a>
          </Button>
        )}
      </div>
    </article>
  );
};
