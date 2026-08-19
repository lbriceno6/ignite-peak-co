// Bloques reutilizables para las landings SEO (plantilla "Problema / Necesidad").
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowRight, Info, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { itemLabel, type NamedItem } from "@/lib/seoLanding";

export const SectionShell = ({
  id, title, children, soft = false,
}: { id?: string; title?: string; children: React.ReactNode; soft?: boolean }) => (
  <section id={id} className={soft ? "scroll-mt-24 rounded-xl bg-secondary/40 p-6 sm:p-8" : "scroll-mt-24"}>
    {title && <h2 className="font-display text-2xl uppercase sm:text-3xl">{title}</h2>}
    <div className={title ? "mt-4" : ""}>{children}</div>
  </section>
);

export const RichText = ({ html }: { html?: string | null }) => {
  if (!html) return null;
  const looksHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!looksHtml) {
    return (
      <div className="max-w-3xl space-y-3 whitespace-pre-line text-muted-foreground">{html}</div>
    );
  }
  return (
    <article
      className="prose prose-neutral max-w-3xl dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) }}
    />
  );
};

export const CausesGrid = ({ items }: { items: NamedItem[] }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {items.map((c, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">{itemLabel(c)}</h3>
        {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
      </div>
    ))}
  </div>
);

export const ChipList = ({ items }: { items: NamedItem[] }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((s, i) => (
      <span
        key={i}
        title={s.description || undefined}
        className="rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm"
      >
        {itemLabel(s)}
      </span>
    ))}
  </div>
);

export const LinkCards = ({
  items, hrefFor, ctaLabel,
}: { items: NamedItem[]; hrefFor: (i: NamedItem) => string | null; ctaLabel?: (i: NamedItem) => string }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map((n, i) => {
      const href = hrefFor(n);
      return (
        <div key={i} className="flex flex-col rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-lg uppercase">{itemLabel(n)}</h3>
          {n.description && <p className="mt-2 flex-1 text-sm text-muted-foreground">{n.description}</p>}
          {href && (
            <Link to={href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              {ctaLabel?.(n) ?? n.cta ?? "Ver más"} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      );
    })}
  </div>
);

export const InPageNav = ({ items }: { items: { id: string; label: string }[] }) => {
  if (items.length < 2) return null;
  return (
    <nav className="-mx-4 mb-10 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2">
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-block whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const LuciaBlock = ({ onAsk }: { onAsk: () => void }) => (
  <section className="rounded-xl bg-secondary/60 p-6 text-center sm:p-10">
    <h2 className="font-display text-2xl uppercase sm:text-3xl">¿No sabes cuál elegir?</h2>
    <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
      Cuéntale a Lucía qué estás buscando y te ayudará a encontrar productos de Nutribatidos según tus
      necesidades, preferencias e ingredientes.
    </p>
    <Button className="mt-5" onClick={onAsk}>
      <MessageCircle size={16} /> Preguntar a Lucía
    </Button>
  </section>
);

export const ProfessionalHelp = ({ text }: { text?: string | null }) => (
  <section id="profesional" className="scroll-mt-24 rounded-xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
    <h2 className="flex items-center gap-2 font-display text-2xl uppercase">
      <Info size={20} className="text-accent" /> ¿Cuándo consultar a un profesional de la salud?
    </h2>
    <div className="mt-4 max-w-3xl whitespace-pre-line text-muted-foreground">
      {text ||
        "Si la molestia es intensa, persistente, aparece después de una lesión o está acompañada de otros síntomas importantes, es recomendable consultar con un profesional de la salud."}
    </div>
    <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
      La información presentada tiene fines educativos y no sustituye la evaluación, diagnóstico o tratamiento
      realizado por un profesional de la salud.
    </p>
  </section>
);
