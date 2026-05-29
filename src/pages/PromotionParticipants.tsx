import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { usePromotions } from "@/hooks/usePromotions";
import { isPromoActiveNow, promoSubtitle, promoTitle } from "@/lib/promotions";
import { resolveProductImage } from "@/lib/productImage";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/catalog";

const PRODUCT_COLS = "id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, badge";

const rowToProduct = (r: any): Product => {
  const price = Number(r.price ?? 0) || 0;
  const sale = Number(r.sale_price ?? 0) || 0;
  const hasSale = sale > 0 && sale < price;

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? sale : price,
    oldPrice: hasSale ? price : undefined,
    rating: Number(r.rating ?? 0),
    reviews: Number(r.reviews_count ?? r.reviews ?? 0),
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: [],
    brand: r.brand ?? "Nutribatidos",
  };
};

const PromotionParticipants = () => {
  const { promotions, loading: promotionsLoading } = usePromotions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const activePromos = useMemo(
    () => promotions.filter((p) => isPromoActiveNow(p) && p.product_ids.length > 0),
    [promotions],
  );
  const productIds = useMemo(
    () => Array.from(new Set(activePromos.flatMap((p) => p.product_ids))),
    [activePromos],
  );
  const mainPromo = activePromos[0];

  useEffect(() => {
    if (promotionsLoading) return;
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    supabase
      .from("products")
      .select(PRODUCT_COLS)
      .in("id", productIds)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .gt("price", 0)
      .then(({ data }) => {
        if (!alive) return;
        const order = new Map(productIds.map((id, index) => [id, index]));
        setProducts(
          ((data ?? []) as any[])
            .map(rowToProduct)
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
        );
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [productIds, promotionsLoading]);

  const title = mainPromo ? promoTitle(mainPromo) : "Productos participantes";
  const subtitle = mainPromo
    ? promoSubtitle(mainPromo)
    : "Productos disponibles en promociones activas.";

  return (
    <Layout>
      <SEO title={`${title} | Nutribatidos`} description={subtitle} path="/promociones/compra-uno-lleva-otro" />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">Promociones</span>
          </nav>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles size={16} /> Promoción activa
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="container-x py-10">
        {loading || promotionsLoading ? (
          <p className="text-sm text-muted-foreground">Cargando productos participantes…</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-lg font-medium">No hay productos participantes disponibles.</p>
            <p className="mt-2 text-sm text-muted-foreground">Revisa el catálogo para encontrar otros productos activos.</p>
            <Button asChild variant="accent" className="mt-5">
              <Link to="/productos">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PromotionParticipants;