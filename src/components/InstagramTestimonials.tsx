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

export const InstagramTestimonials = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id,author_name,author_handle,media_type,media_url,thumbnail_url,caption,instagram_url,rating")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Testimonial[]);
      setLoading(false);
    })();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <section className="container-x py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          <Instagram size={14} /> Comunidad
        </span>
        <h2 className="mt-3 font-display text-3xl uppercase sm:text-4xl">Síguenos en Instagram</h2>
        <p className="mt-2 text-muted-foreground">Historias reales de quienes confían en nuestros productos.</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((t) => {
          const inner = (
            <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border bg-muted shadow-sm">
              {t.media_type === "video" ? (
                <>
                  <video
                    src={t.media_url}
                    poster={t.thumbnail_url ?? undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-smooth group-hover:scale-105"
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
                  className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                />
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-background">
                <div className="flex items-center gap-2">
                  <Instagram size={14} className="text-background/90" />
                  <p className="text-sm font-semibold">{t.author_handle ? `@${t.author_handle.replace(/^@/, "")}` : t.author_name}</p>
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
            <a key={t.id} href={t.instagram_url} target="_blank" rel="noopener noreferrer" aria-label={`Ver publicación de ${t.author_name}`}>
              {inner}
            </a>
          ) : (
            <div key={t.id}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
};
