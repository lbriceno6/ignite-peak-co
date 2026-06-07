import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

import { ProductCard } from "@/components/ProductCard";
import { HomeProductCardStyles } from "@/components/HomeProductCardStyles";
import { useHomeProductCardStyle } from "@/hooks/useHomeProductCardStyle";
import type { Product } from "@/data/catalog";
import type { ProductsCarouselConfig } from "@/hooks/useProductsCarouselConfig";

type Props = {
  config: ProductsCarouselConfig;
  products: Product[];
  eyebrow?: string | null;
};

export function HomeProductsCarousel({ config, products, eyebrow }: Props) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const autoplay = useRef(
    Autoplay({ delay: (config.autoplay_speed || 5) * 1000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

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

  const showArrows = config.show_arrows && products.length > config.visible_desktop;
  const showDots = config.show_dots && count > 1;
  const plugins = config.autoplay ? [autoplay.current] : [];

  const style = useMemo<React.CSSProperties>(() => ({
    // CSS vars consumed by per-item basis utilities
    ["--cv-m" as any]: String(config.visible_mobile || 1),
    ["--cv-t" as any]: String(config.visible_tablet || 2),
    ["--cv-d" as any]: String(config.visible_desktop || 4),
  }), [config.visible_mobile, config.visible_tablet, config.visible_desktop]);

  if (!products.length) return null;

  return (
    <section className="bg-secondary/40 py-10 sm:py-14">
      <div className="container-x hpc-scope">
        <HomeProductCardStylesInline />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {eyebrow && <span className="text-xs font-bold tracking-wide text-accent">{eyebrow}</span>}
            <h2 className="mt-1 font-display text-2xl sm:text-3xl lg:text-4xl">{config.title}</h2>
            {config.subtitle && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{config.subtitle}</p>
            )}
          </div>
          {config.show_view_all && config.view_all_href && (
            <Link
              to={config.view_all_href}
              className="inline-flex items-center gap-1 self-start text-sm font-semibold text-accent hover:underline sm:self-end"
            >
              {config.view_all_label || "Ver todos los productos"} <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div className="relative mt-6 sm:mt-8" style={style}>
          <Carousel
            opts={{ align: "start", loop: products.length > config.visible_desktop, dragFree: false }}
            plugins={plugins}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-4 items-stretch">
              {products.map((p) => (
                <CarouselItem
                  key={p.id}
                  className="pl-3 sm:pl-4 basis-[calc(100%/var(--cv-m))] sm:basis-[calc(100%/var(--cv-t))] lg:basis-[calc(100%/var(--cv-d))] h-auto"
                >
                  <div className="h-full">
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
    </section>
  );
}

function HomeProductCardStylesInline() {
  const { style } = useHomeProductCardStyle();
  return <HomeProductCardStyles style={style} scope=".hpc-scope" />;
}

