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

export type RecommendedSourceTag =
  | "initial"
  | "search"
  | "intent"
  | "browse"
  | "cart"
  | "category";

type Props = {
  blockId: string;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  /** Full personalization pool (used for interest ranking). */
  products: AnyProduct[];
  /** Pre-ordered fallback pool computed by the page (best sellers / featured / etc.). */
  fallbackProducts?: AnyProduct[];
  totalProducts?: number;
  visibleDesktop?: number;
  visibleTablet?: number;
  visibleMobile?: number;
  autoplay?: boolean;
  /** Legacy alias for hideIfEmpty. */
  hideIfNoSignal?: boolean;
  // New behavior
  fallbackEnabled?: boolean;
  replaceWhenInterestDetected?: boolean;
  blendDefaultWithInterest?: boolean;
  hideIfEmpty?: boolean;
  dynamicTextEnabled?: boolean;
  showSourceBadge?: boolean;
  /** Optional override texts for the "no history" state. */
  fallbackTitle?: string | null;
  fallbackSubtitle?: string | null;
};

const INTENT_TITLES: Record<string, { title: string; subtitle: string }> = {
  energia: { title: "Productos para más energía", subtitle: "Seleccionados según tu interés reciente" },
  colageno: { title: "Productos para piel y articulaciones", subtitle: "Relacionados con tu interés en colágeno" },
  proteina: { title: "Productos con más proteína", subtitle: "Relacionados con tu interés reciente" },
  inmunidad: { title: "Productos para tus defensas", subtitle: "Relacionados con tu interés en inmunidad" },
  digestivo: { title: "Productos para tu digestión", subtitle: "Relacionados con tu interés digestivo" },
};

const BADGE_LABELS: Record<RecommendedSourceTag, string> = {
  initial: "Selección inicial",
  search: "Según tu búsqueda",
  intent: "Según tu interés",
  browse: "Según tus productos vistos",
  category: "Según las categorías que viste",
  cart: "Complementos para tu carrito",
};

export function AiRecommendedForYou({
  blockId,
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  products,
  fallbackProducts,
  totalProducts = 8,
  visibleDesktop = 4,
  visibleTablet = 2,
  visibleMobile = 1.2,
  autoplay = true,
  hideIfNoSignal = false,
  fallbackEnabled = true,
  replaceWhenInterestDetected = true,
  blendDefaultWithInterest = false,
  hideIfEmpty = false,
  dynamicTextEnabled = true,
  showSourceBadge = false,
  fallbackTitle,
  fallbackSubtitle,
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
  const recentlyViewedSlugs = useMemo(
    () => new Set((signals ?? []).filter((s) => s.event_type === "browse_product_view" && s.product_slug).map((s) => s.product_slug as string)),
    [signals],
  );
  const effectiveHideIfEmpty = hideIfEmpty || hideIfNoSignal;

  const { items, sourceTag, matchedIntent } = useMemo(() => {
    const limit = Math.max(1, totalProducts);
    const baseFallback = (fallbackEnabled ? (fallbackProducts && fallbackProducts.length ? fallbackProducts : products) : []).slice();
    const fallbackList = baseFallback.slice(0, limit);

    if (signals === null) {
      // not loaded yet — show fallback to avoid empty flash
      return { items: fallbackList, sourceTag: "initial" as RecommendedSourceTag, matchedIntent: null as Intent | null };
    }

    const intent = resolveCurrentIntent(intents, signals);
    const hasIntentProducts = !!intent && (intent.product_ids?.length ?? 0) > 0;

    // Determine source tag based on most-recent meaningful signal
    let tag: RecommendedSourceTag = "initial";
    if (hasSignal) {
      const latest = signals[0];
      if (latest?.event_type === "browse_add_to_cart") tag = "cart";
      else if (latest?.event_type === "browse_search") tag = "search";
      else if (latest?.event_type === "browse_category_view") tag = "category";
      else if (latest?.event_type === "browse_product_view") tag = "browse";
      if (intent) tag = "intent";
    }

    if (!hasSignal) {
      return { items: fallbackList, sourceTag: "initial" as RecommendedSourceTag, matchedIntent: null };
    }

    // Rank products by visitor signal + intent
    const ranked = rankProductsForVisitor(products, signals, intent);

    // Dedup vs "Según lo que viste": exclude recently-viewed slugs unless they are
    // explicit intent products (those still belong here as the primary signal).
    const intentIds = new Set(intent?.product_ids ?? []);
    const filtered = ranked.filter((p) => intentIds.has(p.id) || !recentlyViewedSlugs.has(p.slug));
    let interestProducts = filtered.slice(0, limit);

    // Fill in passes: fallback (no viewed) -> general (no viewed) -> fallback (viewed) -> general (viewed)
    const fillFrom = (source: AnyProduct[], allowViewed: boolean) => {
      const seen = new Set(interestProducts.map((p) => p.id));
      for (const p of source) {
        if (interestProducts.length >= limit) break;
        if (seen.has(p.id)) continue;
        if (!allowViewed && recentlyViewedSlugs.has(p.slug)) continue;
        interestProducts.push(p);
        seen.add(p.id);
      }
    };
    if (interestProducts.length < limit) fillFrom(fallbackList, false);
    if (interestProducts.length < limit) fillFrom(products, false);
    if (interestProducts.length < limit) fillFrom(fallbackList, true);
    if (interestProducts.length < limit) fillFrom(products, true);

    // Decide which list to show
    const interestHasContent = interestProducts.length > 0 && (hasIntentProducts || tag !== "initial");

    if (!interestHasContent) {
      return { items: fallbackList, sourceTag: "initial" as RecommendedSourceTag, matchedIntent: intent };
    }

    if (blendDefaultWithInterest) {
      const seen = new Set<string>();
      const blended: AnyProduct[] = [];
      for (const p of [...interestProducts, ...fallbackList]) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        blended.push(p);
        if (blended.length >= limit) break;
      }
      return { items: blended, sourceTag: tag, matchedIntent: intent };
    }

    if (replaceWhenInterestDetected) {
      return { items: interestProducts, sourceTag: tag, matchedIntent: intent };
    }

    return { items: fallbackList, sourceTag: "initial" as RecommendedSourceTag, matchedIntent: intent };
  }, [products, fallbackProducts, signals, intents, totalProducts, fallbackEnabled, blendDefaultWithInterest, replaceWhenInterestDetected, hasSignal, recentlyViewedSlugs]);

  if (!enabled) return null;
  if (!items.length) {
    if (effectiveHideIfEmpty) return null;
    return null;
  }
  if (effectiveHideIfEmpty && !hasSignal) return null;

  // Dynamic texts
  let dynTitle = title || "Recomendados para ti";
  let dynSubtitle = subtitle ?? "";
  let dynEyebrow = eyebrow || "Personalizado · IA";

  if (dynamicTextEnabled) {
    if (sourceTag === "initial") {
      dynTitle = fallbackTitle || title || "Recomendados para ti";
      dynSubtitle = fallbackSubtitle || subtitle || "Una selección popular para empezar";
      dynEyebrow = eyebrow || "Más populares";
    } else if (matchedIntent) {
      const preset = INTENT_TITLES[matchedIntent.slug];
      dynTitle = preset?.title || `Productos para ${matchedIntent.name || matchedIntent.slug}`;
      dynSubtitle = preset?.subtitle || matchedIntent.subtitle || "Relacionados con tu interés reciente";
      dynEyebrow = eyebrow || "Por tu interés · IA";
    } else {
      dynTitle = title || "Por tu interés · IA";
      dynSubtitle = subtitle || "Productos relacionados con lo que buscaste o exploraste";
    }
  }

  const config: ProductsCarouselConfig = {
    id: blockId,
    is_active: true,
    title: dynTitle,
    subtitle: dynSubtitle,
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

  const badgeLabel = showSourceBadge
    ? sourceTag === "intent" && matchedIntent
      ? `Según tu interés en ${matchedIntent.name || matchedIntent.slug}`
      : BADGE_LABELS[sourceTag]
    : null;

  return (
    <div className="relative">
      {badgeLabel && (
        <div className="container-x pt-3">
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            {badgeLabel}
          </span>
        </div>
      )}
      <HomeProductsCarousel config={config} products={items} eyebrow={dynEyebrow} />
    </div>
  );
}
