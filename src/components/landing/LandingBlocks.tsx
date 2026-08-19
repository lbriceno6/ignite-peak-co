// Bloques visuales para las landings SEO (contenido editorial, nutrientes, confianza, CTA final).
import { Link } from "react-router-dom";
import {
  Apple, ArrowRight, BadgeCheck, CreditCard, Heart, Leaf, MessageCircle, Quote, Shield,
  Sparkles, Sun, Truck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "./LandingSections";
import { itemLabel, type NamedItem } from "@/lib/seoLanding";

const SOFT_TONES = [
  "bg-accent/10 text-accent",
  "bg-primary/10 text-primary",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
];

const ICONS = [Leaf, Sun, Zap, Heart, Apple, Sparkles];

const IconBubble = ({ i, size = 18 }: { i: number; size?: number }) => {
  const Icon = ICONS[i % ICONS.length];
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${SOFT_TONES[i % SOFT_TONES.length]}`} aria-hidden>
      <Icon size={size} />
    </span>
  );
};

/** Sección editorial en 2 columnas: card destacada + bloques de contenido. */
export const EditorialIntro = ({
  highlightTitle, highlightText, perks, blocks,
}: {
  highlightTitle: string;
  highlightText: string;
  perks: { label: string }[];
  blocks: { title: string; content: string }[];
}) => {
  if (!highlightText && blocks.length === 0) return null;
  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="h-fit rounded-2xl border border-border/60 bg-[hsl(38_60%_96%)] p-6 shadow-sm dark:bg-secondary/40 sm:p-8">
        <h2 className="font-display text-xl uppercase sm:text-2xl">{highlightTitle}</h2>
        {highlightText && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{highlightText}</p>}
        {perks.length > 0 && (
          <ul className="mt-6 space-y-3">
            {perks.map((p, i) => (
              <li key={p.label} className="flex items-center gap-3 text-sm font-medium">
                <IconBubble i={i} size={16} />
                {p.label}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="space-y-6">
        {blocks.map((b, i) => (
          <article key={i} className="border-b border-border/60 pb-6 last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <IconBubble i={i} />
              <div className="min-w-0">
                <h3 className="font-display text-lg uppercase leading-snug">{b.title}</h3>
                <div className="mt-2 text-sm text-muted-foreground [&_p]:text-sm">
                  <RichText html={b.content} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

/** Cards de nutrientes / ingredientes con icono, descripción y enlace opcional. */
export const IconCards = ({
  items, hrefFor, compact = false,
}: {
  items: NamedItem[];
  hrefFor?: (i: NamedItem) => string | null;
  compact?: boolean;
}) => (
  <div
    className={
      compact
        ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        : "grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
    }
  >
    {items.map((n, i) => {
      const href = hrefFor?.(n) ?? null;
      return (
        <div
          key={i}
          className="flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-accent/40"
        >
          <IconBubble i={i} size={compact ? 15 : 18} />
          <h3 className="mt-3 text-sm font-semibold leading-snug">{itemLabel(n)}</h3>
          {n.description && (
            <p className={`mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground ${compact ? "line-clamp-3" : ""}`}>
              {n.description}
            </p>
          )}
          {href && (
            <Link to={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Ver productos <ArrowRight size={12} />
            </Link>
          )}
        </div>
      );
    })}
  </div>
);

/** Franja de confianza. */
export const TrustStrip = () => {
  const items = [
    { icon: Truck, title: "Envío a todo el Perú", text: "Entregas rápidas y seguras." },
    { icon: CreditCard, title: "Pago seguro", text: "Compra con confianza y tranquilidad." },
    { icon: MessageCircle, title: "Atención por WhatsApp", text: "Estamos aquí para ayudarte." },
  ];
  return (
    <section className="rounded-2xl border border-border/60 bg-[hsl(38_60%_97%)] px-5 py-5 dark:bg-secondary/30">
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${SOFT_TONES[i]}`} aria-hidden>
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** FAQ en acordeón, 2 columnas en desktop. */
export const FaqAccordion = ({ faqs }: { faqs: { q: string; a: string }[] }) => (
  <section id="faq" className="scroll-mt-24">
    <h2 className="font-display text-2xl uppercase sm:text-3xl">Preguntas frecuentes</h2>
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      {faqs.map((f, i) => (
        <details key={i} className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
            {f.q}
            <ArrowRight size={14} className="shrink-0 text-accent transition-transform group-open:rotate-90" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  </section>
);

export type LandingTestimonial = { caption: string; author: string } | null;

/** CTA comercial final con imagen opcional y testimonio real opcional. */
export const FinalCta = ({
  title, text, image, testimonial, onAskLucia, productsHref = "#productos",
}: {
  title: string;
  text: string;
  image?: string | null;
  testimonial?: LandingTestimonial;
  onAskLucia: () => void;
  productsHref?: string;
}) => (
  <section className="overflow-hidden rounded-2xl border border-border/60 bg-[hsl(38_60%_96%)] dark:bg-secondary/40">
    <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-center">
      {image && (
        <div className="overflow-hidden rounded-xl bg-background">
          <img src={image} alt="" loading="lazy" className="h-48 w-full object-cover lg:h-full" />
        </div>
      )}
      <div className={image ? "" : "lg:col-span-2"}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 className="font-display text-2xl uppercase sm:text-3xl">{title}</h2>
            {text && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{text}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={productsHref}>Ver productos</a>
              </Button>
              <Button variant="outline" onClick={onAskLucia}>
                <MessageCircle size={16} /> Hablar con Lucía
              </Button>
            </div>
          </div>

          {testimonial && (
            <figure className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <Quote size={18} className="text-accent" aria-hidden />
              <blockquote className="mt-2 text-sm leading-relaxed text-muted-foreground">"{testimonial.caption}"</blockquote>
              <figcaption className="mt-3">
                <p className="text-sm font-semibold">{testimonial.author}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck size={13} /> Cliente verificado
                </p>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </div>
  </section>
);

export const ShieldIcon = Shield;
