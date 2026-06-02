import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { ProductCard } from "@/components/ProductCard";
import { usePromotions } from "@/hooks/usePromotions";
import { isPromoActiveNow, promoLabel, promoTitle, promoSubtitle } from "@/lib/promotions";
import type { Product } from "@/data/catalog";

type DbProduct = {
  id: string; slug: string; name: string; short_description: string | null;
  price: number; sale_price: number | null; category: string | null;
  main_image: string | null; badge: string | null;
};

const toCard = (p: DbProduct, badge?: string | null): Product => ({
  id: p.id, slug: p.slug, name: p.name,
  shortDescription: p.short_description ?? "",
  price: Number(p.price ?? 0),
  salePrice: p.sale_price != null ? Number(p.sale_price) : null,
  category: p.category ?? "", mainImage: p.main_image ?? null,
  badge: badge ?? p.badge ?? null,
} as unknown as Product);

const Promotions = () => {
  const { promotions } = usePromotions();
  const [products, setProducts] = useState<DbProduct[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,slug,name,short_description,price,sale_price,category,main_image,badge")
      .eq("is_active", true)
      .then(({ data }) => setProducts((data as DbProduct[]) ?? []));
  }, []);

  const grouped = useMemo(() => {
    const now = new Date();
    const productById = new Map(products.map((p) => [p.id, p]));
    return promotions
      .filter((p) => isPromoActiveNow(p, now) && p.product_ids.length)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map((promo) => ({
        promo,
        items: promo.product_ids
          .map((pid) => productById.get(pid))
          .filter(Boolean)
          .map((p) => toCard(p as DbProduct, promoLabel(promo))),
      }))
      .filter((g) => g.items.length > 0);
  }, [promotions, products]);

  return (
    <Layout>
      <SEO
        title="Promociones — ofertas activas"
        description="Aprovecha nuestras promociones activas: 2x1, descuentos por cantidad y ofertas especiales por tiempo limitado."
      />
      <section className="container-x py-10 sm:py-14">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Promociones especiales</span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl">Todas las promociones</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Estas son todas las promociones activas en este momento. Por tiempo limitado.
          </p>
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-10 text-center">
            <p className="text-lg font-semibold">No hay promociones activas en este momento.</p>
            <p className="mt-2 text-sm text-muted-foreground">Vuelve pronto o explora nuestro catálogo.</p>
            <Link to="/productos" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
              Ver todos los productos →
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(({ promo, items }) => (
              <div key={promo.id}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                        {promoLabel(promo)}
                      </span>
                      <h2 className="font-display text-xl sm:text-2xl">{promo.name}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {promoTitle(promo)} · {promoSubtitle(promo)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Promotions;
