// AI-powered related-products block for the product detail page.
// Loads a slim catalog snapshot, asks the `ai-product-related` edge function
// to pick complementary products with short reasons, and renders them in a grid.
// If the toggle is off or AI/heuristic returns nothing, the parent's existing
// "También te puede gustar" block keeps working as a fallback.

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
} from "@/lib/userPersonalization";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";
import { logAiRecoClick } from "@/lib/recoEvents";

type Props = {
  productSlug: string;
  productName: string;
  productCategory?: string | null;
  productShortDescription?: string | null;
  max?: number;
  /** Called once the AI returns a non-empty list, so the parent can hide its
   * fallback "También te puede gustar" block to avoid duplication. */
  onPicksReady?: (count: number) => void;
};

type Pick = { slug: string; reason: string };

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  category: string | null;
  main_image: string | null;
  gallery_images?: any;
  badge: string | null;
  rating?: number | null;
};

function toCard(p: DbProduct): Product & { id: string } {
  const image = resolveProductImage({
    main_image: p.main_image,
    gallery_images: p.gallery_images,
    slug: p.slug,
  } as any);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortBenefit: p.short_description ?? "",
    price: Number(p.sale_price ?? p.price ?? 0),
    oldPrice: p.sale_price ? Number(p.price) : undefined,
    rating: Number(p.rating ?? 0),
    reviews: 0,
    label: (p.badge as any) ?? undefined,
    image,
    category: p.category ?? "",
    goal: [],
    brand: "",
  };
}

export function AiProductRelated({
  productSlug,
  productName,
  productCategory,
  productShortDescription,
  max = 4,
  onPicksReady,
}: Props) {
  const enabled = useAiBlockEnabled("product_ai_related");
  const [catalog, setCatalog] = useState<Array<Product & { id: string }> | null>(null);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  // Load catalog + signals
  useEffect(() => {
    let alive = true;
    (async () => {
      const [prodRes, sigs, ints] = await Promise.all([
        (supabase as any)
          .from("products")
          .select(
            "id, slug, name, short_description, price, sale_price, category, main_image, gallery_images, badge, rating",
          )
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .limit(120),
        fetchRecentBrowseSignals(20),
        fetchActiveIntents(),
      ]);
      if (!alive) return;
      const list = ((prodRes?.data ?? []) as DbProduct[]).map(toCard);
      setCatalog(list);
      setIntent(resolveCurrentIntent(ints, sigs));
    })();
    return () => { alive = false; };
  }, [productSlug]);

  // Call AI once catalog is loaded
  useEffect(() => {
    if (!enabled || !catalog || catalog.length === 0) return;
    let alive = true;
    (async () => {
      const recent_signals = []; // Not strictly needed: edge function reuses intent
      try {
        const { data } = await (supabase as any).functions.invoke("ai-product-related", {
          body: {
            product: {
              slug: productSlug,
              name: productName,
              category: productCategory ?? null,
              short_description: productShortDescription ?? null,
            },
            catalog: catalog.map((p) => ({
              slug: p.slug,
              name: p.name,
              category: p.category ?? null,
              price: p.price,
            })),
            intent_slug: intent?.slug ?? null,
            intent_name: intent?.name ?? null,
            recent_signals,
            max,
          },
        });
        if (!alive) return;
        const list: Pick[] = Array.isArray(data?.picks) ? data.picks : [];
        setPicks(list);
        if (list.length > 0) onPicksReady?.(list.length);
      } catch {
        if (alive) setPicks([]);
      }
    })();
    return () => { alive = false; };
  }, [enabled, catalog, productSlug, productName, productCategory, productShortDescription, intent, max, onPicksReady]);

  const productsBySlug = useMemo(() => {
    const m = new Map<string, Product & { id: string }>();
    (catalog ?? []).forEach((p) => m.set(p.slug, p));
    return m;
  }, [catalog]);

  if (!enabled) return null;
  if (!picks || picks.length === 0) return null;

  const rendered = picks
    .map((pk) => ({ pk, product: productsBySlug.get(pk.slug) }))
    .filter((x) => !!x.product) as { pk: Pick; product: Product & { id: string } }[];
  if (!rendered.length) return null;

  return (
    <section className="container-x pb-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
            <Sparkles size={12} /> Recomendado por IA
          </p>
          <h2 className="mt-1 font-display text-2xl uppercase sm:text-3xl">
            Combínalo con esto
          </h2>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rendered.map(({ pk, product }) => (
          <div key={product.id} className="flex flex-col gap-2">
            <ProductCard product={product} />
            <p className="px-1 text-xs text-muted-foreground">
              <Sparkles size={10} className="mr-1 inline -translate-y-0.5 text-accent" />
              {pk.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
