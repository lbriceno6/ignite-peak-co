import { useEffect, useMemo, useState } from "react";
import { HomeProductsCarousel } from "@/components/HomeProductsCarousel";
import type { ProductsCarouselConfig } from "@/hooks/useProductsCarouselConfig";
import type { Product } from "@/data/catalog";
import type { CarouselDesign } from "@/lib/homeCarouselDesign";
import {
  fetchRecentBrowseSignals,
  getRecentlyViewedSlugs,
} from "@/lib/userPersonalization";
import { getRecentlyViewedSlugsLocal } from "@/lib/recoEvents";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";

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
  visibleMobile = 1,
  autoplay = false,
  hideIfEmpty = true,
}: Props) {
  const enabled = useAiBlockEnabled("home_recently_viewed");
  const [loaded, setLoaded] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Primary source: localStorage (works for every visitor, no RLS)
      const local = getRecentlyViewedSlugsLocal(totalProducts);
      if (local.length) {
        if (active) { setSlugs(local); setLoaded(true); }
        return;
      }
      // Fallback: lucia_events (only readable by admin, harmless to try)
      try {
        const sigs = await fetchRecentBrowseSignals(40);
        const remote = getRecentlyViewedSlugs(sigs, totalProducts);
        if (active) { setSlugs(remote); setLoaded(true); }
      } catch {
        if (active) { setSlugs([]); setLoaded(true); }
      }
    })();
    return () => { active = false; };
  }, [totalProducts]);

  const items = useMemo<AnyProduct[]>(() => {
    if (!loaded) return [];
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const viewed = slugs.map((s) => bySlug.get(s)).filter(Boolean) as AnyProduct[];
    if (viewed.length > 0) return viewed;
    if (hideIfEmpty) return [];
    return products.slice(0, totalProducts);
  }, [loaded, slugs, products, totalProducts, hideIfEmpty]);

  if (!enabled) return null;
  if (!loaded) return null;
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
