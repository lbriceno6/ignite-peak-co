// Lightweight client-side personalization layer.
// Reads recent browse_* events from public.lucia_events (logged via recoEvents.ts)
// and resolves the "current intent" of the visitor based on:
//   - Recent searches (search_query)
//   - Recent category views (category_slug)
//   - Recent product views (product_slug)
// Maps those signals to the closest row in public.purchase_intents.
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitor";

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type Intent = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  banner_image: string | null;
  cta_text: string | null;
  cta_url: string | null;
  keywords: string[];
  category_slugs: string[];
  product_ids: string[];
  priority: number;
};

export type BrowseSignal = {
  event_type: string;
  product_id: string | null;
  product_slug: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export async function fetchRecentBrowseSignals(limit = 30): Promise<BrowseSignal[]> {
  try {
    const { data } = await (supabase as any)
      .from("lucia_events")
      .select("event_type, product_id, product_slug, metadata, created_at")
      .eq("visitor_id", getVisitorId())
      .in("event_type", [
        "browse_product_view",
        "browse_category_view",
        "browse_search",
        "browse_add_to_cart",
      ])
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as BrowseSignal[];
  } catch {
    return [];
  }
}

export async function fetchActiveIntents(): Promise<Intent[]> {
  try {
    const { data } = await (supabase as any)
      .from("purchase_intents")
      .select("*")
      .eq("is_active", true)
      .order("priority");
    return (data ?? []) as Intent[];
  } catch {
    return [];
  }
}

// Resolve which intent best matches the visitor's recent browsing.
// Returns the matched intent (or null if no signal).
export function resolveCurrentIntent(
  intents: Intent[],
  signals: BrowseSignal[],
): Intent | null {
  if (!intents.length || !signals.length) return null;

  const scores = new Map<string, number>();
  const bump = (intentId: string, by: number) => {
    scores.set(intentId, (scores.get(intentId) ?? 0) + by);
  };

  // Decay: most recent signals weigh more
  signals.forEach((sig, idx) => {
    const weight = Math.max(1, 10 - idx); // 10..1
    const query = norm(sig.metadata?.search_query ?? "");
    const categorySlug = norm(sig.metadata?.category_slug ?? "");
    const productSlug = norm(sig.product_slug ?? "");
    const intentSlug = norm(sig.metadata?.intent_slug ?? "");

    for (const it of intents) {
      // Direct intent_slug match (e.g. from intelligent-search response)
      if (intentSlug && norm(it.slug) === intentSlug) {
        bump(it.id, weight * 3);
      }
      // Keyword match against search query
      if (query) {
        for (const k of it.keywords ?? []) {
          const kn = norm(k);
          if (kn && (query === kn || query.includes(kn) || kn.includes(query))) {
            bump(it.id, weight * 2);
            break;
          }
        }
      }
      // Category match
      if (categorySlug && (it.category_slugs ?? []).some((c) => norm(c) === categorySlug)) {
        bump(it.id, weight * 1.5);
      }
      // Product match (intent has explicit product list)
      if (productSlug && sig.product_id && (it.product_ids ?? []).includes(sig.product_id)) {
        bump(it.id, weight);
      }
    }
  });

  if (!scores.size) return null;
  let best: { id: string; score: number } | null = null;
  scores.forEach((score, id) => {
    if (!best || score > best.score) best = { id, score };
  });
  return intents.find((i) => i.id === best!.id) ?? null;
}

// Returns the slugs of products the visitor recently viewed, deduped, newest first.
export function getRecentlyViewedSlugs(signals: BrowseSignal[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of signals) {
    if (s.event_type !== "browse_product_view") continue;
    const slug = s.product_slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= limit) break;
  }
  return out;
}

// Rank products by relevance to the visitor's signals + matched intent.
// Falls back to original order when no signal exists.
export function rankProductsForVisitor<T extends { id: string; slug: string; category?: string | null }>(
  products: T[],
  signals: BrowseSignal[],
  intent: Intent | null,
): T[] {
  if (!products.length) return products;
  const viewedSlugs = new Set(getRecentlyViewedSlugs(signals, 30));
  const viewedCategories = new Set<string>();
  signals.forEach((s) => {
    const c = norm(s.metadata?.category_slug ?? "");
    if (c) viewedCategories.add(c);
  });

  const intentProductIds = new Set(intent?.product_ids ?? []);
  const intentCats = new Set((intent?.category_slugs ?? []).map(norm));

  const scored = products.map((p) => {
    let score = 0;
    if (intentProductIds.has(p.id)) score += 100;
    const catN = norm(p.category ?? "");
    if (intentCats.has(catN)) score += 30;
    if (viewedCategories.has(catN)) score += 10;
    // Slight de-prioritization of items the visitor already viewed to surface new options
    if (viewedSlugs.has(p.slug)) score -= 5;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.p);
}
