import { useEffect, useMemo, useState } from "react";
import { HomeProductsCarousel } from "@/components/HomeProductsCarousel";
import type { ProductsCarouselConfig } from "@/hooks/useProductsCarouselConfig";
import type { Product } from "@/data/catalog";
import {
  fetchRecentBrowseSignals,
  getRecentlyViewedSlugs,
  type BrowseSignal,
} from "@/lib/userPersonalization";

type AnyProduct = Product & { id: string; slug: string };

type Props = {
  blockId: string;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  products: AnyProduct[];
  totalProducts?: number;
  visibleDesktop?: number;
  visibleTablet?: number;
  visibleMobile?: number;
  autoplay?: boolean;
  hideIfEmpty?: boolean;
};

export function AiRecentlyViewed({
  blockId,
  eyebrow,
  title,
  subtitle,
  products,
  totalProducts = 8,
  visibleDesktop = 4,
  visibleTablet = 2,
  visibleMobile = 1.2,
  autoplay = false,
  hideIfEmpty = true,
}: Props) {
  const [signals, setSignals] = useState<BrowseSignal[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const sigs = await fetchRecentBrowseSignals(40);
      if (active) setSignals(sigs);
    })();
    return () => { active = false; };
  }, []);

  const items = useMemo(() => {
    if (signals === null) return null;
    const slugs = getRecentlyViewedSlugs(signals, totalProducts);
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as AnyProduct[];
  }, [signals, products, totalProducts]);

  if (items === null) return null;
  if (!items.length && hideIfEmpty) return null;
  if (!items.length) return null;

  const config: ProductsCarouselConfig = {
    id: blockId,
    is_active: true,
    title: title || "Según lo que viste",
    subtitle: subtitle ?? "",
    source: "manual" as any,
    total_items: totalProducts,
    visible_desktop: visibleDesktop,
    visible_tablet: visibleTablet,
    visible_mobile: visibleMobile,
    autoplay,
    autoplay_speed: 5,
    show_arrows: true,
    show_dots: false,
    show_view_all: false,
    view_all_label: "",
    view_all_href: "",
    manual_slugs: items.map((p) => p.slug),
  };

  return (
    <HomeProductsCarousel
      config={config}
      products={items}
      eyebrow={eyebrow || "Tu historial"}
    />
  );
}
