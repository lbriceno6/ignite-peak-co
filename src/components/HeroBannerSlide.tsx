import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { getHeroStyles, mergeHeroSlideDesign, type HeroSizeMode } from "@/lib/heroSlideDesign";

export type HeroBannerSlide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  image_mobile_url?: string | null;
  primary_label: string | null;
  primary_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  design?: any;
};

type Props = {
  slide: HeroBannerSlide;
  mode?: HeroSizeMode; // when set, forces a specific size (used in admin previews)
  asLinks?: boolean; // if false, render buttons as plain spans (admin preview)
};

export function HeroBannerSlide({ slide, mode, asLinks = true }: Props) {
  const design = mergeHeroSlideDesign(slide.design);
  // When mode is forced (preview), use it; otherwise default to desktop and rely on responsive overrides below.
  const styles = getHeroStyles(design, mode || "desktop");
  const img = (mode === "mobile" && slide.image_mobile_url) ? slide.image_mobile_url : (slide.image_url || heroImage);

  const PrimaryWrap: any = asLinks && slide.primary_href ? Link : "span";
  const SecondaryWrap: any = asLinks && slide.secondary_href ? Link : "span";

  return (
    <div style={styles.container}>
      <img src={img} alt={slide.title} style={styles.image} />
      <div style={styles.overlay} />
      <div style={styles.content}>
        {slide.eyebrow && (
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide"
            style={{ borderColor: `${design.text.color}55`, color: design.text.color }}
          >
            <Zap size={12} /> {slide.eyebrow}
          </span>
        )}
        <h1 className="mt-4 font-display font-bold" style={styles.title}>
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="mt-4" style={styles.subtitle}>
            {slide.subtitle}
          </p>
        )}
        <div
          className="mt-6 flex flex-wrap gap-3"
          style={{
            justifyContent:
              styles.content.textAlign === "center"
                ? "center"
                : styles.content.textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          {slide.primary_label && (
            <PrimaryWrap
              {...(asLinks && slide.primary_href ? { to: slide.primary_href } : {})}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition hover:opacity-90"
              style={styles.primaryBtn}
            >
              {slide.primary_label} <ArrowRight size={16} />
            </PrimaryWrap>
          )}
          {!design.buttons.hideSecondary && slide.secondary_label && (
            <SecondaryWrap
              {...(asLinks && slide.secondary_href ? { to: slide.secondary_href } : {})}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition hover:opacity-90"
              style={styles.secondaryBtn}
            >
              {slide.secondary_label}
            </SecondaryWrap>
          )}
        </div>
      </div>
    </div>
  );
}
