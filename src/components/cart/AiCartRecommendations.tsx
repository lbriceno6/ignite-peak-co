// AI-powered complementary recommendations for the cart.
// 1. Loads a slim catalog of active products from the database.
// 2. Calls the `ai-cart-recommendations` edge function (Lovable AI) which
//    returns up to N complementary product slugs + a short reason.
// 3. Falls back to client-side ranking (intent + category overlap +
//    free-shipping-gap fit) if AI returns nothing.
//
// Renders a compact horizontal strip with reason chips. Designed to drop
// into Cart.tsx and CartDrawer.tsx without changing existing layout.

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import { useCart } from "@/store/cart";
import { useFreeShippingBar } from "@/hooks/useFreeShippingBar";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  rankProductsForVisitor,
  resolveCurrentIntent,
  type BrowseSignal,
  type Intent,
} from "@/lib/userPersonalization";

type Pick = { slug: string; reason: string };

type Props = {
  cartSubtotal: number;
  max?: number;
  variant?: "full" | "compact";
  title?: string;
  subtitle?: string;
};

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
  brand_id?: string | null;
};

function toProduct(p: DbProduct): Product & { id: string } {
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

export function AiCartRecommendations({
  cartSubtotal,
  max = 4,
  variant = "full",
  title = "Completa tu compra con IA",
  subtitle = "Sugerencias inteligentes según tu carrito.",
}: Props) {
  const { items: cartItems, add } = useCart();
  const shipping = useFreeShippingBar();
  const [allProducts, setAllProducts] = useState<Array<Product & { id: string }> | null>(null);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [signals, setSignals] = useState<BrowseSignal[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);

  // 1) Load active products + browse signals + intents in parallel
  useEffect(() => {
    let active = true;
    (async () => {
      const [prodRes, sigs, ints] = await Promise.all([
        (supabase as any)
          .from("products")
          .select(
            "id, slug, name, short_description, price, sale_price, category, main_image, gallery_images, badge, rating, brand_id",
          )
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .limit(120),
        fetchRecentBrowseSignals(20),
        fetchActiveIntents(),
      ]);
      if (!active) return;
      const list = ((prodRes?.data ?? []) as DbProduct[]).map(toProduct);
      setAllProducts(list);
      setSignals(sigs);
      setIntents(ints);
    })();
    return () => {
      active = false;
    };
  }, []);

  const cartSlugs = useMemo(() => cartItems.map((i) => i.product.slug), [cartItems]);
  const cartCats = useMemo(
    () => cartItems.map((i) => i.product.category).filter(Boolean) as string[],
    [cartItems],
  );

  const freeShippingGap = useMemo(() => {
    if (!shipping.enabled || shipping.threshold <= 0) return 0;
    return Math.max(0, shipping.threshold - cartSubtotal);
  }, [shipping, cartSubtotal]);

  // 2) Call AI edge function whenever cart contents change meaningfully
  useEffect(() => {
    if (!allProducts || !cartItems.length) {
      setPicks(null);
      return;
    }
    let active = true;
    (async () => {
      const intent = resolveCurrentIntent(intents, signals);
      const payload = {
        cart: cartItems.map((i) => ({
          slug: i.product.slug,
          name: i.product.name,
          category: i.product.category,
          quantity: i.quantity,
        })),
        catalog: allProducts.map((p) => ({
          slug: p.slug,
          name: p.name,
          category: p.category,
          price: p.price,
        })),
        free_shipping_gap: freeShippingGap,
        intent_slug: intent?.slug ?? null,
        recent_signals: signals.slice(0, 10).map((s) => ({
          type: s.event_type,
          slug: s.product_slug,
          query: s.metadata?.search_query ?? null,
          category: s.metadata?.category_slug ?? null,
        })),
        max,
      };

      try {
        const { data, error } = await supabase.functions.invoke("ai-cart-recommendations", {
          body: payload,
        });
        if (!active) return;
        if (!error && Array.isArray((data as any)?.picks) && (data as any).picks.length) {
          setPicks((data as any).picks as Pick[]);
          return;
        }
      } catch {
        /* fall through to heuristic */
      }

      // Fallback: client-side heuristic ranking
      if (!active) return;
      const cartSlugSet = new Set(cartSlugs);
      const candidates = allProducts.filter((p) => !cartSlugSet.has(p.slug));
      const intent = resolveCurrentIntent(intents, signals);
      const ranked = rankProductsForVisitor(candidates, signals, intent);
      const cartCatSet = new Set(cartCats.map((c) => c.toLowerCase()));
      const scored = ranked
        .map((p) => {
          let bonus = 0;
          if (cartCatSet.has((p.category ?? "").toLowerCase())) bonus += 3;
          if (freeShippingGap > 0 && p.price > 0) {
            const diff = Math.abs(p.price - freeShippingGap);
            if (diff <= freeShippingGap * 0.4) bonus += 5;
            else if (p.price <= freeShippingGap) bonus += 2;
          }
          return { p, bonus };
        })
        .sort((a, b) => b.bonus - a.bonus)
        .slice(0, max);

      setPicks(
        scored.map(({ p }) => ({
          slug: p.slug,
          reason:
            freeShippingGap > 0 && p.price <= freeShippingGap * 1.4
              ? "Te acerca al envío gratis"
              : "Complementa tu pedido",
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, [
    allProducts,
    cartSlugs.join(","),
    cartCats.join(","),
    freeShippingGap,
    intents,
    signals,
    max,
  ]);

  const productsBySlug = useMemo(() => {
    const m = new Map<string, Product & { id: string }>();
    (allProducts ?? []).forEach((p) => m.set(p.slug, p));
    return m;
  }, [allProducts]);

  if (!picks || !picks.length) return null;
  const rendered = picks
    .map((pk) => ({ pk, product: productsBySlug.get(pk.slug) }))
    .filter((x) => !!x.product) as { pk: Pick; product: Product & { id: string } }[];
  if (!rendered.length) return null;

  return (
    <section
      className={
        variant === "compact"
          ? "rounded-lg border bg-secondary/30 p-3"
          : "rounded-lg border bg-secondary/30 p-5"
      }
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
            <Sparkles size={11} /> Sugerencias IA
          </p>
          <h3 className="font-display text-lg leading-tight">{title}</h3>
          {variant === "full" && subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>

      {variant === "compact" ? (
        <div className="space-y-2">
          {rendered.map(({ pk, product }) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-md border bg-background p-2"
            >
              <img
                src={product.image}
                alt={product.name}
                className="h-12 w-12 flex-shrink-0 rounded bg-secondary object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="truncate text-[11px] text-accent">{pk.reason}</p>
              </div>
              <button
                onClick={() => add(product)}
                className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground hover:opacity-90"
              >
                Añadir
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rendered.map(({ pk, product }) => (
            <div key={product.id} className="relative">
              <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow">
                <Sparkles size={10} /> {pk.reason}
              </span>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AiCartRecommendations;
