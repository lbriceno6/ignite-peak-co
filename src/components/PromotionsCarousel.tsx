import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel, CarouselContent, CarouselItem, type CarouselApi,
} from "@/components/ui/carousel";
import { ProductCard } from "@/components/ProductCard";
import { HomeProductCardStyles } from "@/components/HomeProductCardStyles";
import { useHomeProductCardStyle } from "@/hooks/useHomeProductCardStyle";
import { usePromotions } from "@/hooks/usePromotions";
import { isPromoActiveNow, promoLabel } from "@/lib/promotions";
import { getPromotionImage } from "@/lib/productImage";
import productPlaceholder from "@/assets/product-placeholder.jpg";
import type { Product } from "@/data/catalog";
import { buildScopedCss, DEFAULT_BG, DEFAULT_LAYOUT, type CarouselDesign } from "@/lib/homeCarouselDesign";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  category: string | null;
  main_image: string | null;
  gallery_images?: any;
  badge: string | null;
};

type Props = {
  block: {
    id: string;
    eyebrow: string | null;
    title: string | null;
    subtitle: string | null;
    cta_label: string | null;
    cta_href: string | null;
    settings?: Record<string, any> | null;
  };
  products: DbProduct[];
  design?: CarouselDesign;
};

const toCardProduct = (p: DbProduct, promoBadge?: string | null): Product => {
  const image = getPromotionImage(
    {
      main_image: p.main_image,
      gallery_images: Array.isArray(p.gallery_images) ? p.gallery_images : null,
    },
    null,
    productPlaceholder,
  );
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortBenefit: p.short_description ?? "",
    price: Number(p.sale_price ?? p.price ?? 0),
    oldPrice: p.sale_price ? Number(p.price) : undefined,
    rating: 4.8,
    reviews: 0,
    label: promoBadge ?? p.badge ?? null,
    image,
    category: p.category ?? "",
    goal: [],
    brand: "",
  } as unknown as Product;
};

export function PromotionsCarousel({ block, products, design }: Props) {
  const { promotions } = usePromotions();
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const settings = block.settings ?? {};
  const mode: "auto" | "manual" = settings.carousel_mode === "manual" ? "manual" : "auto";
  const manualIds: string[] = Array.isArray(settings.promotion_ids) ? settings.promotion_ids : [];
  const maxProducts: number = Number(settings.max_products ?? 0); // 0 = sin límite

  const layout = design?.layout ?? DEFAULT_LAYOUT;
  const background = design?.background ?? DEFAULT_BG;

  const autoplay = useRef(
    Autoplay({ delay: (layout.autoplaySpeed || 5) * 1000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const items = useMemo(() => {
    const now = new Date();
    const eligible = promotions
      .filter((p) => {
        if (!isPromoActiveNow(p, now)) return false;
        if (!p.product_ids.length) return false;
        if (mode === "manual") return manualIds.includes(p.id);
        return p.show_in_carousel;
      })
      .sort((a, b) => {
        if (mode === "manual") {
          const ia = manualIds.indexOf(a.id);
          const ib = manualIds.indexOf(b.id);
          if (ia !== ib) return ia - ib;
        }
        if (a.sort_order_home !== b.sort_order_home) return a.sort_order_home - b.sort_order_home;
        return (b.priority || 0) - (a.priority || 0);
      });

    const productById = new Map(products.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const promo of eligible) {
      for (const pid of promo.product_ids) {
        if (seen.has(pid)) continue;
        const prod = productById.get(pid);
        if (!prod) continue;
        seen.add(pid);
        out.push(toCardProduct(prod, promoLabel(promo)));
        if (maxProducts > 0 && out.length >= maxProducts) break;
      }
      if (maxProducts > 0 && out.length >= maxProducts) break;
    }
    return out;
  }, [promotions, products, mode, manualIds, maxProducts]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  const scopeId = `hcs-promo-${block.id}`;
  const scopedCss = useMemo(() => buildScopedCss(scopeId, { layout, background }), [scopeId, layout, background]);

  if (!items.length) return null;

  const showArrows = layout.showArrows && items.length > layout.itemsDesktop;
  const showDots = layout.showDots && count > 1;
  const plugins = layout.autoplay ? [autoplay.current] : [];

  return (
    <section id={scopeId} className="hcs-scope hpc-scope">
      <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      <div className="hcs-bg">
        <div className="hcs-container">
          <HomeProductCardStylesInline />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              {block.eyebrow && (
                <span className="text-xs font-bold tracking-wide text-accent">{block.eyebrow}</span>
              )}
              <h2 className="mt-1 font-display text-2xl sm:text-3xl lg:text-4xl">
                {block.title || "Ofertas recomendadas para usted"}
              </h2>
              {block.subtitle && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{block.subtitle}</p>
              )}
            </div>
            {block.cta_label && block.cta_href && (
              <Link
                to={block.cta_href}
                className="inline-flex items-center gap-1 self-start text-sm font-semibold text-accent hover:underline sm:self-end"
              >
                {block.cta_label} <ArrowRight size={16} />
              </Link>
            )}
          </div>

          <div className="relative mt-6 sm:mt-8">
            <Carousel
              opts={{
                align: layout.centerMobileCard || layout.mobileAlign === "center" ? "center" : "start",
                loop: layout.loop && items.length > layout.itemsDesktop,
                dragFree: layout.freeScrollMobile && !layout.centerMobileCard,
              }}
              plugins={plugins}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="hcs-track items-stretch">
                {items.map((p) => (
                  <CarouselItem key={p.id} className="hcs-item h-auto">
                    <div className={layout.equalHeight ? "h-full" : ""}>
                      <ProductCard product={p} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {showArrows && (
                <>
                  <button
                    type="button"
                    aria-label="Anterior"
                    onClick={() => api?.scrollPrev()}
                    className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 p-2 shadow-md transition hover:bg-accent hover:text-accent-foreground sm:flex"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente"
                    onClick={() => api?.scrollNext()}
                    className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 p-2 shadow-md transition hover:bg-accent hover:text-accent-foreground sm:flex"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </Carousel>

            {showDots && (
              <div className="mt-4 flex justify-center gap-1.5">
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir al grupo ${i + 1}`}
                    onClick={() => api?.scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === current ? "w-6 bg-accent" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeProductCardStylesInline() {
  const { style } = useHomeProductCardStyle();
  return <HomeProductCardStyles style={style} scope=".hcs-scope" />;
}
