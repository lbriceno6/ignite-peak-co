// AI block on the product detail page that explains in 1-2 sentences
// why this product fits the visitor, based on the active purchase intent
// resolved from recent browse signals.
// Renders nothing if the toggle is off or no signal is available.

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
} from "@/lib/userPersonalization";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";

type Props = {
  productCategory?: string | null;
};

function reasonFor(intent: Intent | null, productCategory?: string | null) {
  if (!intent) return null;
  const catMatch =
    !!productCategory &&
    intent.category_slugs?.some((c) => c.toLowerCase() === productCategory.toLowerCase());
  const lead = catMatch
    ? `Encaja con tu objetivo: ${intent.name}.`
    : `Va con lo que has estado mirando: ${intent.name}.`;
  const tail =
    intent.subtitle ||
    intent.description ||
    "Lo identificamos a partir de tu navegación reciente.";
  return `${lead} ${tail}`;
}

export function AiWhyForYou({ productCategory }: Props) {
  const enabled = useAiBlockEnabled("product_why_for_you");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [intents, signals] = await Promise.all([
        fetchActiveIntents(),
        fetchRecentBrowseSignals(30),
      ]);
      if (!alive) return;
      setIntent(resolveCurrentIntent(intents, signals));
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  if (!enabled) return null;
  if (!ready || !intent) return null;
  const text = reasonFor(intent, productCategory);
  if (!text) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Sparkles size={14} />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Por qué para ti · IA</p>
        <p className="mt-1 text-foreground/85">{text}</p>
      </div>
    </div>
  );
}
