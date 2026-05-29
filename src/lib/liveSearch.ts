import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";

export type LiveProduct = Product & { stock: number };

export type LiveSearchResult = {
  products: LiveProduct[];
  suggestions: string[]; // dynamic suggestion terms (need names matched)
  totalEstimated: number;
  matchedNeedSlug?: string | null;
  matchedNeedName?: string | null;
  matchedCategorySlug?: string | null;
};

const PRODUCT_COLS =
  "id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, badge, stock, tags, ingredients";

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const rowToProduct = (r: any): LiveProduct => {
  const price = Number(r.price ?? 0) || 0;
  const sale = Number(r.sale_price ?? 0) || 0;
  const hasSale = sale > 0 && sale < price;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? sale : price,
    oldPrice: hasSale ? price : undefined,
    rating: Number(r.rating ?? 0),
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: [],
    brand: r.brand ?? "Nutribatidos",
    stock: Number(r.stock ?? 0),
  };
};

type NeedRow = {
  slug: string;
  name: string;
  keywords: string[] | null;
  related_category: string | null;
  related_products: string[] | null;
};

type MapRow = {
  keyword: string;
  product_ids: string[] | null;
  category_slug: string | null;
  need_slug: string | null;
};

// Simple in-memory cache
let cache: { needs: NeedRow[]; maps: MapRow[]; ts: number } | null = null;
const CACHE_MS = 60_000;

async function loadCache() {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache;
  const [needsRes, mapsRes] = await Promise.all([
    (supabase.from as any)("search_needs")
      .select("slug,name,keywords,related_category,related_products")
      .eq("is_active", true),
    (supabase.from as any)("search_keyword_map")
      .select("keyword,product_ids,category_slug,need_slug")
      .eq("is_active", true),
  ]);
  cache = {
    needs: (needsRes.data as NeedRow[]) ?? [],
    maps: (mapsRes.data as MapRow[]) ?? [],
    ts: Date.now(),
  };
  return cache;
}

export async function runLiveSearch(query: string, max = 4): Promise<LiveSearchResult> {
  const q = norm(query);
  if (!q || q.length < 2) {
    return { products: [], suggestions: [], totalEstimated: 0 };
  }

  const { needs, maps } = await loadCache();

  // 1) Match keyword map
  const mapHit = maps.find((m) => {
    const k = norm(m.keyword);
    return k && (k === q || k.includes(q) || q.includes(k));
  });

  // 2) Match needs by keyword/name
  const needHits = needs.filter((n) => {
    if (norm(n.name).includes(q)) return true;
    return (n.keywords ?? []).some((k) => {
      const kn = norm(k);
      return kn && (kn === q || kn.includes(q) || q.includes(kn));
    });
  });

  const matchedNeed = needHits[0] || null;
  const matchedCategorySlug = mapHit?.category_slug || matchedNeed?.related_category || null;
  const explicitIds = new Set<string>([
    ...(mapHit?.product_ids ?? []),
    ...(matchedNeed?.related_products ?? []),
  ]);

  // 3) Query products: by name/category/brand/short_description/tags/ingredients
  const like = `%${q}%`;
  const orClauses = [
    `name.ilike.${like}`,
    `short_description.ilike.${like}`,
    `category.ilike.${like}`,
    `brand.ilike.${like}`,
  ].join(",");

  const productsQuery = supabase
    .from("products")
    .select(PRODUCT_COLS, { count: "exact" })
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .or(orClauses)
    .order("stock", { ascending: false })
    .order("rating", { ascending: false })
    .limit(Math.max(max * 3, 12));

  const explicitProductsQuery =
    explicitIds.size > 0
      ? supabase
          .from("products")
          .select(PRODUCT_COLS)
          .in("id", Array.from(explicitIds))
          .eq("is_active", true)
          .eq("approval_status", "approved")
      : null;

  const [searchRes, explicitRes] = await Promise.all([
    productsQuery,
    explicitProductsQuery ?? Promise.resolve({ data: [], count: 0 } as any),
  ]);

  const seen = new Set<string>();
  const ordered: any[] = [];
  // Prioritize explicit (need/keyword map) products first
  for (const r of (explicitRes.data ?? []) as any[]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      ordered.push(r);
    }
  }
  for (const r of (searchRes.data ?? []) as any[]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      ordered.push(r);
    }
  }

  // Tag-based filter (in JS, since `tags` may be array)
  const products = ordered.map(rowToProduct);

  const suggestions = Array.from(
    new Set(
      needHits
        .map((n) => n.name)
        .concat(maps.filter((m) => norm(m.keyword).includes(q)).map((m) => m.keyword)),
    ),
  ).slice(0, 8);

  return {
    products,
    suggestions,
    totalEstimated: Math.max(searchRes.count ?? products.length, products.length),
    matchedNeedSlug: matchedNeed?.slug ?? null,
    matchedNeedName: matchedNeed?.name ?? null,
    matchedCategorySlug,
  };
}

export function invalidateLiveSearchCache() {
  cache = null;
}
