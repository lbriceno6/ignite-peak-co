// Post-purchase smart insights block.
// Calls the `ai-post-purchase` edge function with the order's items + a slim
// catalog snapshot + the visitor's current intent, then renders:
//   - personalized thank-you line
//   - estimated re-order reminder (when applicable)
//   - 3-4 next-step product picks with short reasons
// Hidden when the admin toggle `post_purchase_insights` is off.

import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
} from "@/lib/userPersonalization";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";
import { logAiRecoClick } from "@/lib/recoEvents";
import { useCurrency } from "@/context/CurrencyContext";

type Item = {
  product_slug: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
};

type Props = {
  orderCode: string;
  items: Item[];
};

type Pick = { slug: string; reason: string };

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  price: number;
  sale_price: number | null;
  main_image: string | null;
  gallery_images: any;
  short_description: string | null;
};

export function AiPostPurchaseInsights({ orderCode, items }: Props) {
  const enabled = useAiBlockEnabled("post_purchase_insights");
  const { format } = useCurrency();
  const [thankYou, setThankYou] = useState<string>("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [reorderDays, setReorderDays] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Record<string, CatalogRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !items.length) {
      setLoading(false);
      return;
    }
    let alive = true;

    (async () => {
      // Load slim catalog + items' categories + intent in parallel
      const [{ data: cat }, signals, intents] = await Promise.all([
        (supabase as any)
          .from("products")
          .select("id, slug, name, category, price, sale_price, main_image, gallery_images, short_description")
          .eq("approval_status", "approved")
          .eq("is_active", true)
          .limit(200),
        fetchRecentBrowseSignals(40),
        fetchActiveIntents(),
      ]);
      if (!alive) return;

      const catalogRows: CatalogRow[] = (cat ?? []) as CatalogRow[];
      const map: Record<string, CatalogRow> = {};
      catalogRows.forEach((r) => { map[r.slug] = r; });
      setCatalog(map);

      const intent = resolveCurrentIntent(intents, signals);

      const itemsPayload = items.map((it) => ({
        slug: it.product_slug,
        name: it.product_name,
        category: map[it.product_slug]?.category ?? null,
        quantity: it.quantity,
      }));

      const catalogPayload = catalogRows.map((r) => ({
        slug: r.slug,
        name: r.name,
        category: r.category,
        price: Number(r.sale_price ?? r.price ?? 0),
      }));

      try {
        const { data } = await (supabase as any).functions.invoke("ai-post-purchase", {
          body: {
            order_code: orderCode,
            items: itemsPayload,
            catalog: catalogPayload,
            intent_slug: intent?.slug ?? null,
            intent_name: intent?.name ?? null,
            max: 4,
          },
        });
        if (!alive) return;
        setThankYou(data?.thank_you ?? "");
        setPicks(Array.isArray(data?.picks) ? data.picks : []);
        setReorderDays(Number.isFinite(data?.reorder_days) ? data.reorder_days : null);
      } catch {
        // silent fail
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [enabled, orderCode, items]);

  const reorderDate = useMemo(() => {
    if (!reorderDays) return null;
    const d = new Date();
    d.setDate(d.getDate() + reorderDays);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  }, [reorderDays]);

  if (!enabled) return null;
  if (loading) {
    return (
      <div className="rounded-lg border border-border p-5 animate-pulse">
        <div className="h-4 w-1/2 bg-muted rounded mb-2" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    );
  }
  if (!thankYou && !picks.length) return null;

  return (
    <section className="rounded-lg border border-accent/30 bg-accent/5 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-3 border-b border-accent/20">
        <Sparkles size={16} className="text-accent" />
        <span className="text-xs uppercase tracking-wider font-medium text-accent">
          Tu siguiente paso
        </span>
      </header>

      <div className="p-5 space-y-5">
        {thankYou && <p className="text-base leading-relaxed">{thankYou}</p>}

        {reorderDate && (
          <div className="flex items-start gap-3 text-sm bg-background/60 rounded-md p-3 border border-border">
            <RefreshCw size={16} className="mt-0.5 text-accent shrink-0" />
            <div>
              <p className="font-medium">Recordatorio de re-pedido</p>
              <p className="text-muted-foreground">
                Calculamos que tu pedido te durará ~{reorderDays} días.
                Te conviene reordenar alrededor del <strong>{reorderDate}</strong> para no quedarte sin stock.
              </p>
            </div>
          </div>
        )}

        {picks.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Recomendado para ti
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {picks.map((p) => {
                const prod = catalog[p.slug];
                if (!prod) return null;
                const img = resolveProductImage({
                  main_image: prod.main_image,
                  gallery_images: prod.gallery_images,
                  slug: prod.slug,
                } as any);
                const price = Number(prod.sale_price ?? prod.price ?? 0);
                return (
                  <li key={p.slug}>
                    <Link
                      to={`/product/${prod.slug}`}
                      className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-accent transition-colors bg-background"
                    >
                      {img && (
                        <img
                          src={img}
                          alt={prod.name}
                          className="h-14 w-14 rounded object-cover shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{prod.name}</p>
                        <p className="text-xs text-accent truncate">{p.reason}</p>
                        <p className="text-sm font-semibold mt-1">{format(price)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
