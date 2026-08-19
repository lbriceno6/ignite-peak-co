// Hero editorial reutilizable para las landings SEO (fondo pastel + onda inferior).
import { Clock, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";

export type Crumb = { label: string; href?: string };

type Props = {
  breadcrumb: Crumb[];
  category?: string | null;
  title: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  imageAlt?: string | null;
  readingTime?: number;
  cta?: { label: string; href: string } | null;
};

function BrandBadge() {
  const { content } = useSiteContent(["logo_text", "logo_accent", "logo_image_url"], {
    logo_text: "NUTRI",
    logo_accent: "BATIDOS",
    logo_image_url: "",
  });
  return (
    <div className="mt-8 flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
        {content.logo_image_url ? (
          <img src={content.logo_image_url} alt="Nutribatidos" className="h-8 w-8 object-contain" loading="lazy" />
        ) : (
          <span className="text-[9px] font-semibold leading-none">
            {content.logo_text}
            <span className="text-accent">{content.logo_accent}</span>
          </span>
        )}
      </div>
      <div className="text-sm">
        <p className="font-semibold">Nutribatidos</p>
        <p className="text-muted-foreground">Tu tienda online de nutrición y bienestar.</p>
      </div>
    </div>
  );
}

export function SeoLandingHero({
  breadcrumb, category, title, shortDescription, heroImage, imageAlt, readingTime, cta,
}: Props) {
  return (
    <header className="relative overflow-hidden bg-[hsl(var(--landing-hero))]">
      <div
        className="absolute inset-0 -z-0"
        style={{ background: "linear-gradient(160deg, hsl(var(--landing-hero)) 0%, hsl(var(--landing-hero-2)) 100%)" }}
        aria-hidden
      />
      <div className="container-x relative z-10 pb-24 pt-6 sm:pb-28 md:pb-36 md:pt-8">
        <nav aria-label="Ruta de navegación" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-x-1.5">
            {breadcrumb.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link to={c.href} className="hover:text-accent">{c.label}</Link>
                ) : (
                  <span className="text-foreground">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6 grid items-center gap-8 md:mt-8 md:grid-cols-[45fr,55fr] md:gap-12">
          <div className="order-2 md:order-1">
            {heroImage ? (
              <img
                src={heroImage}
                alt={imageAlt || title}
                width={880}
                height={880}
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/5] w-full rounded-3xl object-cover shadow-lg sm:aspect-[5/4] md:aspect-[4/5]"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-3xl border border-border bg-background/60 sm:aspect-[5/4] md:aspect-[4/5]">
                <Leaf className="h-14 w-14 text-[hsl(var(--landing-hero-pill))]" aria-hidden />
              </div>
            )}
          </div>

          <div className="order-1 md:order-2">
            {category && (
              <span className="inline-flex rounded-full border border-[hsl(var(--landing-hero-pill)/0.45)] px-4 py-1.5 text-xs font-medium text-[hsl(var(--landing-hero-pill))]">
                {category}
              </span>
            )}
            <h1 className="mt-4 font-display text-[30px] leading-tight sm:text-[38px] md:text-[44px] lg:text-[52px]">
              {title}
            </h1>
            {shortDescription && (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {shortDescription}
              </p>
            )}
            {!!readingTime && (
              <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} aria-hidden /> Lectura de {readingTime} minuto{readingTime === 1 ? "" : "s"}
              </p>
            )}
            {cta && (
              <a
                href={cta.href}
                className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                {cta.label}
              </a>
            )}
            <BrandBadge />
          </div>
        </div>
      </div>

      {/* Transición orgánica hacia el contenido */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-10 h-[60px] w-full text-background sm:h-[80px]"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden
        focusable="false"
      >
        <path fill="currentColor" d="M0,48 C360,96 1080,0 1440,40 L1440,80 L0,80 Z" />
      </svg>
    </header>
  );
}

/** Tiempo de lectura estimado (200 palabras/min, mínimo 1). */
export function readingTimeFromText(...parts: (string | null | undefined)[]) {
  const words = parts
    .filter(Boolean)
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
