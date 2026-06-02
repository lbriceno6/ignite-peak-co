import { useEffect, useState } from "react";
import { Instagram, Play, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Testimonial = {
  id: string;
  author_name: string;
  author_handle: string | null;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  instagram_url: string | null;
  rating: number | null;
};

export type InstagramTestimonialsProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  desktopColumns?: 2 | 3 | 4 | 5 | number;
  mobileLayout?: "grid" | "carousel";
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor?: string;
  spacingTop?: number;
  spacingBottom?: number;
  limit?: number;
};

export const InstagramTestimonials = ({
  eyebrow = "Comunidad",
  title = "Síguenos en Instagram",
  subtitle = "Historias reales de quienes confían en nuestros productos.",
  desktopColumns = 4,
  mobileLayout = "grid",
  showButton = false,
  buttonText = "Ver Instagram",
  buttonUrl = "",
  backgroundColor,
  spacingTop = 64,
  spacingBottom = 64,
  limit,
}: InstagramTestimonialsProps = {}) => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("testimonials")
        .select("id,author_name,author_handle,media_type,media_url,thumbnail_url,caption,instagram_url,rating")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (limit && limit > 0) q = q.limit(limit);
      const { data } = await q;
      setItems((data ?? []) as Testimonial[]);
      setLoading(false);
    })();
  }, [limit]);

  if (loading || items.length === 0) return null;

  const cols = Math.min(5, Math.max(2, Number(desktopColumns) || 4));
  const colsClass =
    cols === 5 ? "lg:grid-cols-5"
    : cols === 4 ? "lg:grid-cols-4"
    : cols === 3 ? "lg:grid-cols-3"
    : "lg:grid-cols-2";
  const mobileClass = mobileLayout === "carousel"
    ? "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:gap-4 sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0"
    : "grid grid-cols-2 gap-4 sm:grid-cols-2";

  return (
    <section
      className="w-full"
      style={{
        paddingTop: spacingTop,
        paddingBottom: spacingBottom,
        backgroundColor: backgroundColor || undefined,
      }}
    >
      <div className="container-x">
        <div className="text-center">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <Instagram size={14} /> {eyebrow}
            </span>
          )}
          {title && <h2 className="mt-3 font-display text-3xl uppercase sm:text-4xl">{title}</h2>}
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>

        <div className={`mt-10 ${mobileClass} ${colsClass}`}>
          {items.map((t) => {
            const card = (
              <div className="group relative aspect-[9/16] w-full min-w-[70vw] max-w-full snap-start overflow-hidden rounded-2xl border bg-muted shadow-sm sm:min-w-0">
                {t.media_type === "video" ? (
                  <>
                    <video
                      src={t.media_url}
                      poster={t.thumbnail_url ?? undefined}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover transition-smooth group-hover:scale-105"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                    <div className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur">
                      <Play size={16} className="ml-0.5" />
                    </div>
                  </>
                ) : (
                  <img
                    src={t.media_url}
                    alt={`Testimonio de ${t.author_name}`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-smooth group-hover:scale-105"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                  />
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-background">
                  <div className="flex items-center gap-2">
                    <Instagram size={14} className="text-background/90" />
                    <p className="text-sm font-semibold">
                      {t.author_handle ? `@${t.author_handle.replace(/^@/, "")}` : t.author_name}
                    </p>
                  </div>
                  {t.caption && <p className="mt-1 line-clamp-2 text-xs text-background/80">{t.caption}</p>}
                  {t.rating ? (
                    <div className="mt-2 flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-accent text-accent" />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
            return t.instagram_url ? (
              <a
                key={t.id}
                href={t.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver publicación de ${t.author_name}`}
                className="block"
              >
                {card}
              </a>
            ) : (
              <div key={t.id}>{card}</div>
            );
          })}
        </div>

        {showButton && buttonUrl && (
          <div className="mt-8 text-center">
            <a
              href={buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wider text-background transition hover:opacity-90"
            >
              <Instagram size={16} /> {buttonText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
