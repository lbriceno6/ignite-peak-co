import { useEffect, useMemo, useState } from "react";
import { HomeProductsCarousel } from "@/components/HomeProductsCarousel";
import type { ProductsCarouselConfig } from "@/hooks/useProductsCarouselConfig";
import type { Product } from "@/data/catalog";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  rankProductsForVisitor,
  resolveCurrentIntent,
  type BrowseSignal,
  type Intent,
} from "@/lib/userPersonalization";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";

type AnyProduct = Product & { id: string; slug: string; category?: string | null };

type Props = {
  blockId: string;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  products: AnyProduct[];
  totalProducts?: number;
  visibleDesktop?: number;
  visibleTablet?: number;
  visibleMobile?: number;
  autoplay?: boolean;
  hideIfNoSignal?: boolean;
};

export function AiRecommendedForYou({
  blockId,
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  products,
  totalProducts = 8,
  visibleDesktop = 4,
  visibleTablet = 2,
  visibleMobile = 1.2,
  autoplay = true,
  hideIfNoSignal = false,
}: Props) {
  const enabled = useAiBlockEnabled("home_recommended");
  const [signals, setSignals] = useState<BrowseSignal[] | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);


  useEffect(() => {
    let active = true;
    (async () => {
      const [sigs, ints] = await Promise.all([
        fetchRecentBrowseSignals(30),
        fetchActiveIntents(),
      ]);
      if (!active) return;
      setSignals(sigs);
      setIntents(ints);
    })();
    return () => { active = false; };
  }, []);

  const hasSignal = (signals?.length ?? 0) > 0;

  const items = useMemo(() => {
    if (signals === null) return null; // not yet loaded
    const intent = resolveCurrentIntent(intents, signals);
    const ranked = rankProductsForVisitor(products, signals, intent);
    return ranked.slice(0, Math.max(1, totalProducts));
  }, [products, signals, intents, totalProducts]);

  if (!enabled) return null;
  if (items === null) return null;
  if (!items.length) return null;
  if (hideIfNoSignal && !hasSignal) return null;

  const config: ProductsCarouselConfig = {
    id: blockId,
    is_active: true,
    title: title || "Recomendados para ti",
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
    show_view_all: !!ctaHref,
    view_all_label: ctaLabel || "Ver todos",
    view_all_href: ctaHref || "/productos",
    manual_slugs: items.map((p) => p.slug),
  };

  return (
    <HomeProductsCarousel
      config={config}
      products={items}
      eyebrow={eyebrow || (hasSignal ? "Personalizado · IA" : "Más populares")}
    />
  );
}
