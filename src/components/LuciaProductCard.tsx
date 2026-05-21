import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/lucia";
import { track } from "@/lib/analytics";

type Product = {
  slug: string;
  name: string;
  price?: number | null;
  stock?: number | null;
  image?: string | null;
  short?: string | null;
};

export const LuciaProductCard = ({
  product,
  whatsappNumber,
}: {
  product: Product;
  whatsappNumber: string;
}) => {
  const msg = `Hola, quiero información sobre ${product.name}. Lo vi en la web de Nutribatidos y Lucía me lo recomendó.`;
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-2.5 shadow-sm">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{product.name}</div>
        <div className="flex items-center gap-2 text-xs">
          {typeof product.price === "number" && (
            <span className="font-bold text-foreground">S/. {Number(product.price).toFixed(2)}</span>
          )}
          {typeof product.stock === "number" && (
            <span className={product.stock > 0 ? "text-success" : "text-destructive"}>
              {product.stock > 0 ? "En stock" : "Sin stock"}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
            <Link to={`/producto/${product.slug}`} onClick={() => track("lucia_product_click" as any, { slug: product.slug })}>
              <ExternalLink size={12} /> Ver
            </Link>
          </Button>
          <Button asChild size="sm" className="h-7 bg-success px-2 text-xs text-background hover:bg-success/90">
            <a
              href={whatsappUrl(whatsappNumber, msg)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("lucia_whatsapp_click" as any, { slug: product.slug, source: "product_card" })}
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
