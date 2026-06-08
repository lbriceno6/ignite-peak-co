import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
  type BrowseSignal,
} from "@/lib/userPersonalization";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";
import { mergeAiBannerLayout, buildAiBannerCss, type AiBannerLayout } from "@/lib/aiBannerLayout";

type Props = {
  blockId: string;
  eyebrow?: string | null;
  fallbackTitle?: string | null;
  fallbackSubtitle?: string | null;
  fallbackImage?: string | null;
  fallbackCtaLabel?: string | null;
  fallbackCtaHref?: string | null;
  fallbackIntentSlug?: string;
  spacingTop?: number;
  spacingBottom?: number;
  hideIfNoSignal?: boolean;
  confidenceThreshold?: number;
  overlayEnabled?: boolean;
  overlayColor?: string;
  overlayOpacity?: number; // 0-100
  layout?: Partial<AiBannerLayout> | null;
};

/**
 * Score the visitor's recent signals against the active intents.
 * Returns the best match plus a normalized 0-1 confidence value.
 */
function detectVisitorIntent(
  intents: Intent[],
  signals: BrowseSignal[],
): { intent: Intent | null; confidence: number; source: string } {
  if (!intents.length || !signals.length) {
    return { intent: null, confidence: 0, source: "none" };
  }
  const matched = resolveCurrentIntent(intents, signals);
  if (!matched) return { intent: null, confidence: 0, source: "none" };
  // Confidence: how many recent signals point at this intent vs total.
  const norm = (s: string) => (s || "").toLowerCase().trim();
  const intentCats = new Set((matched.category_slugs ?? []).map(norm));
  const intentKw = (matched.keywords ?? []).map(norm).filter(Boolean);
  const itSlug = norm(matched.slug);
  const itSlugAlt = itSlug.replace(/[_-]/g, "");
  let hits = 0;
  signals.slice(0, 15).forEach((sig) => {
    const cat = norm(sig.metadata?.category_slug ?? "");
    const q = norm(sig.metadata?.search_query ?? "");
    const pslug = norm(sig.product_slug ?? "");
    if (cat && intentCats.has(cat)) hits += 1;
    if (cat && itSlug && (cat.includes(itSlug) || cat.replace(/[_-]/g, "").includes(itSlugAlt))) hits += 1;
    if (cat && intentKw.some((k) => k.length > 3 && cat.includes(k))) hits += 1;
    if (q && intentKw.some((k) => q.includes(k) || k.includes(q))) hits += 1;
    if (pslug && itSlug && (pslug.includes(itSlug) || pslug.includes(itSlugAlt))) hits += 1;
    if (pslug && intentKw.some((k) => k.length > 3 && pslug.includes(k))) hits += 1;
    if (sig.product_id && (matched.product_ids ?? []).includes(sig.product_id)) hits += 1;
  });
  const confidence = Math.min(1, hits / 4);
  return { intent: matched, confidence, source: "browse_history" };
}

export function AiDynamicBanner({
  blockId,
  eyebrow,
  fallbackTitle,
  fallbackSubtitle,
  fallbackImage,
  fallbackCtaLabel,
  fallbackCtaHref,
  fallbackIntentSlug,
  spacingTop = 32,
  spacingBottom = 32,
  hideIfNoSignal = false,
  confidenceThreshold = 0.2,
  overlayEnabled = true,
  overlayColor = "#000000",
  overlayOpacity = 55,
  layout,
}: Props) {
  const L = useMemo(() => mergeAiBannerLayout(layout || {}), [layout]);
  const enabled = useAiBlockEnabled("home_dynamic_banner");
  const [intents, setIntents] = useState<Intent[]>([]);
  const [signals, setSignals] = useState<BrowseSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [is, sg] = await Promise.all([
          fetchActiveIntents().catch(() => [] as Intent[]),
          fetchRecentBrowseSignals(30).catch(() => [] as BrowseSignal[]),
        ]);
        if (!active) return;
        setIntents(is);
        setSignals(sg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => {
    if (loading) return null;
    const hasBannerContent = (i: Intent | null | undefined) =>
      !!(i && (i.title || i.banner_image));
    const detected = detectVisitorIntent(intents, signals);
    // Use detected intent only if confidence passes threshold AND it has banner content.
    if (
      detected.intent &&
      detected.confidence >= confidenceThreshold &&
      hasBannerContent(detected.intent)
    ) {
      return detected.intent;
    }
    // Safe-mode fallback: detected intent had no banner → use admin-selected fallback.
    if (fallbackIntentSlug) {
      const f = intents.find((i) => i.slug === fallbackIntentSlug);
      if (hasBannerContent(f)) return f!;
    }
    return null;
  }, [loading, intents, signals, fallbackIntentSlug, confidenceThreshold]);

  if (!enabled) return null;
  if (loading) return null;

  // Compose content with safe fallbacks. The banner must never render empty.
  const title = resolved?.title || fallbackTitle || "Recomendado para ti";
  const subtitle =
    resolved?.subtitle || resolved?.description || fallbackSubtitle || "";
  const image = resolved?.banner_image || fallbackImage || "";
  const ctaLabel = resolved?.cta_text || fallbackCtaLabel || "Ver productos";
  const ctaHref =
    resolved?.cta_url ||
    (resolved?.category_slugs?.[0] ? `/categoria/${resolved.category_slugs[0]}` : null) ||
    (resolved ? `/buscar?intencion=${resolved.slug}` : fallbackCtaHref || "/productos");

  // Hide only if there's truly no content to show and the admin requested it.
  const hasManualContent = !!(fallbackTitle || fallbackImage || fallbackSubtitle);
  if (!resolved && !hasManualContent && hideIfNoSignal) return null;

  const wrapperClass = containerWidth === "full" ? "" : "container-x";
  const inner = `relative overflow-hidden ${rounded ? "rounded-2xl" : ""} bg-surface-darker text-background`;
  const eyebrowText =
    (resolved as any)?.eyebrow ||
    eyebrow ||
    (resolved ? `Para ti · ${resolved.name}` : "Recomendado para ti");

  const safeId = `aidb-${String(blockId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const overlayAlpha = Math.max(0, Math.min(100, Number(overlayOpacity) || 0)) / 100;

  return (
    <section
      key={blockId}
      style={{ paddingTop: spacingTop, paddingBottom: spacingBottom }}
    >
      <style>{`
        #${safeId} { min-height: ${heightMobile}px; }
        @media (min-width: 640px) { #${safeId} { min-height: ${heightTablet}px; } }
        @media (min-width: 1024px) { #${safeId} { min-height: ${heightDesktop}px; } }
      `}</style>
      <div className={wrapperClass}>
        <div className={inner}>
          {image && (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {overlayEnabled && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: overlayColor, opacity: overlayAlpha }}
              aria-hidden
            />
          )}
          <div
            id={safeId}
            className="relative grid items-center p-6 sm:p-10 lg:p-12"
          >
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold tracking-wide text-accent">
                <Sparkles size={12} /> {eyebrowText}
              </span>
              <h3 className="mt-4 font-display text-2xl leading-tight sm:text-4xl drop-shadow-sm">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-3 text-sm text-background/85 sm:text-base">{subtitle}</p>
              )}
              {ctaHref && (
                <Button size="lg" variant="hero" className="mt-6" asChild>
                  <Link to={ctaHref}>
                    {ctaLabel} <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
