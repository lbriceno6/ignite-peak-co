import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
} from "@/lib/userPersonalization";

type Props = {
  blockId: string;
  eyebrow?: string | null;
  fallbackTitle?: string | null;
  fallbackSubtitle?: string | null;
  fallbackImage?: string | null;
  fallbackCtaLabel?: string | null;
  fallbackCtaHref?: string | null;
  fallbackIntentSlug?: string;
  containerWidth?: "container" | "full";
  spacingTop?: number;
  spacingBottom?: number;
  rounded?: boolean;
  hideIfNoSignal?: boolean;
};

export function AiDynamicBanner({
  blockId,
  eyebrow,
  fallbackTitle,
  fallbackSubtitle,
  fallbackImage,
  fallbackCtaLabel,
  fallbackCtaHref,
  fallbackIntentSlug,
  containerWidth = "container",
  spacingTop = 32,
  spacingBottom = 32,
  rounded = true,
  hideIfNoSignal = false,
}: Props) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [intents, signals] = await Promise.all([
        fetchActiveIntents(),
        fetchRecentBrowseSignals(30),
      ]);
      if (!active) return;
      let matched = resolveCurrentIntent(intents, signals);
      if (!matched && fallbackIntentSlug) {
        matched = intents.find((i) => i.slug === fallbackIntentSlug) ?? null;
      }
      setIntent(matched);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [fallbackIntentSlug]);

  if (loading) return null;
  if (!intent && hideIfNoSignal && !fallbackTitle) return null;

  const title = intent?.title || fallbackTitle || "Recomendado para ti";
  const subtitle = intent?.subtitle || intent?.description || fallbackSubtitle || "";
  const image = intent?.banner_image || fallbackImage || "";
  const ctaLabel = intent?.cta_text || fallbackCtaLabel || "Ver productos";
  const ctaHref =
    intent?.cta_url ||
    (intent?.category_slugs?.[0] ? `/categoria/${intent.category_slugs[0]}` : null) ||
    (intent ? `/buscar?intencion=${intent.slug}` : fallbackCtaHref || "/productos");

  const wrapperClass = containerWidth === "full" ? "" : "container-x";
  const inner = `relative overflow-hidden ${rounded ? "rounded-2xl" : ""} bg-surface-darker text-background`;

  return (
    <section
      key={blockId}
      style={{ paddingTop: spacingTop, paddingBottom: spacingBottom }}
    >
      <div className={wrapperClass}>
        <div className={inner}>
          {image && (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-55"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-surface-darker via-surface-darker/75 to-transparent" />
          <div className="relative grid min-h-[280px] items-center p-8 sm:p-12">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold tracking-wide text-accent">
                <Sparkles size={12} /> {eyebrow || (intent ? `Para ti · ${intent.name}` : "Recomendado para ti")}
              </span>
              <h3 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">{title}</h3>
              {subtitle && <p className="mt-3 text-background/75">{subtitle}</p>}
              {ctaHref && (
                <Button size="lg" variant="hero" className="mt-6" asChild>
                  <Link to={ctaHref}>{ctaLabel} <ArrowRight /></Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
