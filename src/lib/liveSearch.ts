import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";

export type LiveProduct = Product & { stock: number };

export type LiveBrand = { id: string; name: string; slug: string; logo_url: string | null };

export type LiveSearchResult = {
  products: LiveProduct[];
  suggestions: string[];
  brands: LiveBrand[];
  totalEstimated: number;
  matchedNeedSlug?: string | null;
  matchedNeedName?: string | null;
  matchedCategorySlug?: string | null;
  expandedTerms: string[];
  intentSlug?: string | null;
  intentTitle?: string | null;
  intentCtaUrl?: string | null;
  intentCtaText?: string | null;
  intentHasProductIds?: boolean;
  diagnostic?: string | null;
};

// NOTE: `tags` column does NOT exist on products. Don't add it back.
const PRODUCT_COLS =
  "id, slug, name, short_description, description, price, sale_price, main_image, category, subcategory, main_ingredient, rating, brand, badge, stock";

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Built-in synonym / partial-term dictionary. Keys are the *partial* a user
// might type; values are full terms we should ALSO search for.
const SYNONYMS: Record<string, string[]> = {
  col: ["colageno", "articulaciones", "piel", "huesos"],
  cola: ["colageno"],
  colag: ["colageno"],
  ome: ["omega", "omega 3"],
  omeg: ["omega", "omega 3"],
  mac: ["maca", "energia"],
  maca: ["maca", "energia"],
  can: ["cansancio", "energia", "fatiga"],
  cans: ["cansancio", "energia"],
  ener: ["energia", "vitalidad", "maca"],
  vit: ["vitamina", "vitaminas"],
  dig: ["digestion", "digestivo", "estomago"],
  diges: ["digestion", "digestivo"],
  inf: ["inflamacion", "antiinflamatorio"],
  gim: ["gimnasio", "fitness", "proteina"],
  fit: ["fitness", "proteina", "gimnasio"],
  prot: ["proteina"],
  "sin az": ["sin azucar", "stevia", "endulzante"],
  "sin azu": ["sin azucar"],
  azu: ["azucar", "sin azucar"],
  rel: ["relajacion", "estres", "sueno"],
  est: ["estres", "ansiedad"],
  sue: ["sueno", "dormir", "melatonina"],
  inm: ["inmunidad", "defensas"],
  def: ["defensas", "inmunidad"],
  hue: ["huesos", "calcio", "colageno"],
  pie: ["piel", "colageno", "belleza"],
  bell: ["belleza", "piel", "cabello"],
  cab: ["cabello", "biotina"],
  art: ["articulaciones", "colageno"],
};

const expandQuery = (q: string): string[] => {
  const base = norm(q);
  if (!base) return [];
  const out = new Set<string>([base]);
  // Synonym hits: any dictionary key that the query starts with, OR that starts with the query
  for (const key of Object.keys(SYNONYMS)) {
    if (base.startsWith(key) || key.startsWith(base)) {
      out.add(key);
      for (const v of SYNONYMS[key]) out.add(norm(v));
    }
  }
  // Cap to avoid massive OR
  return Array.from(out).slice(0, 8);
};

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

type IntentRow = {
  slug: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  keywords: string[] | null;
  category_slugs: string[] | null;
  product_ids: string[] | null;
  cta_url: string | null;
  cta_text: string | null;
  priority: number | null;
};

let cache: { needs: NeedRow[]; maps: MapRow[]; intents: IntentRow[]; ts: number } | null = null;
const CACHE_MS = 60_000;

async function loadCache() {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache;
  const [needsRes, mapsRes, intentsRes] = await Promise.all([
    (supabase.from as any)("search_needs")
      .select("slug,name,keywords,related_category,related_products")
      .eq("is_active", true),
    (supabase.from as any)("search_keyword_map")
      .select("keyword,product_ids,category_slug,need_slug")
      .eq("is_active", true),
    (supabase.from as any)("purchase_intents")
      .select("slug,name,title,subtitle,keywords,category_slugs,product_ids,cta_url,cta_text,priority")
      .eq("is_active", true)
      .order("priority", { ascending: true }),
  ]);
  cache = {
    needs: (needsRes.data as NeedRow[]) ?? [],
    maps: (mapsRes.data as MapRow[]) ?? [],
    intents: (intentsRes.data as IntentRow[]) ?? [],
    ts: Date.now(),
  };
  return cache;
}

const SEARCH_FIELDS = [
  "name",
  "short_description",
  "description",
  "category",
  "subcategory",
  "brand",
  "main_ingredient",
];

export async function runLiveSearch(query: string, max = 4): Promise<LiveSearchResult> {
  const q = norm(query);
  if (!q || q.length < 2) {
    return { products: [], suggestions: [], brands: [], totalEstimated: 0, expandedTerms: [] };
  }

  const { needs, maps, intents } = await loadCache();
  const terms = expandQuery(q);

  // Detect purchase intent against full query + expanded terms
  const candidateTerms = Array.from(new Set([q, ...terms]));
  const matchToken = (kn: string) =>
    !!kn && candidateTerms.some((t) => t === kn || t.includes(kn) || kn.includes(t));

  let intentHit: IntentRow | null = null;
  for (const it of intents) {
    const slugN = norm(it.slug);
    const nameN = norm(it.name);
    const kws = (it.keywords ?? []).map(norm).filter(Boolean);
    const cats = (it.category_slugs ?? []).map(norm).filter(Boolean);
    if (
      matchToken(slugN) ||
      matchToken(nameN) ||
      kws.some(matchToken) ||
      cats.some(matchToken)
    ) {
      intentHit = it;
      break;
    }
  }

  // Match keyword map (partial)
  const mapHit = maps.find((m) => {
    const k = norm(m.keyword);
    return k && terms.some((t) => k.includes(t) || t.includes(k));
  });

  // Match needs by keyword/name (partial)
  const needHits = needs.filter((n) => {
    const name = norm(n.name);
    if (terms.some((t) => name.includes(t) || t.includes(name))) return true;
    return (n.keywords ?? []).some((k) => {
      const kn = norm(k);
      return kn && terms.some((t) => kn.includes(t) || t.includes(kn));
    });
  });

  const matchedNeed = needHits[0] || null;
  const intentCategory = (intentHit?.category_slugs ?? [])[0] || null;
  const matchedCategorySlug =
    intentCategory || mapHit?.category_slug || matchedNeed?.related_category || null;

  // Priority: intent product_ids -> keyword_map -> needs.related_products
  const intentIds = intentHit?.product_ids ?? [];
  const explicitOrdered: string[] = [];
  const explicitSeen = new Set<string>();
  for (const id of [
    ...intentIds,
    ...(mapHit?.product_ids ?? []),
    ...(matchedNeed?.related_products ?? []),
  ]) {
    if (id && !explicitSeen.has(id)) {
      explicitSeen.add(id);
      explicitOrdered.push(id);
    }
  }

  // Build OR across all terms × all fields
  const orClauses: string[] = [];
  for (const t of terms) {
    const like = `%${t}%`;
    for (const f of SEARCH_FIELDS) orClauses.push(`${f}.ilike.${like}`);
  }

  const productsQuery = supabase
    .from("products")
    .select(PRODUCT_COLS, { count: "exact" })
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .or(orClauses.join(","))
    .order("stock", { ascending: false })
    .order("rating", { ascending: false })
    .limit(Math.max(max * 4, 16));

  const explicitProductsQuery =
    explicitOrdered.length > 0
      ? supabase
          .from("products")
          .select(PRODUCT_COLS)
          .in("id", explicitOrdered)
          .eq("is_active", true)
          .eq("approval_status", "approved")
      : null;

  const categoryProductsQuery =
    matchedCategorySlug
      ? supabase
          .from("products")
          .select(PRODUCT_COLS)
          .eq("category", matchedCategorySlug)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .order("stock", { ascending: false })
          .limit(max * 2)
      : null;

  const brandsQuery = (supabase.from as any)("brands")
    .select("id,name,slug,logo_url")
    .eq("is_active", true)
    .or(terms.map((t) => `name.ilike.%${t}%,slug.ilike.%${t}%`).join(","))
    .limit(5);

  const [searchRes, explicitRes, categoryRes, brandsRes] = await Promise.all([
    productsQuery,
    explicitProductsQuery ?? Promise.resolve({ data: [], count: 0 } as any),
    categoryProductsQuery ?? Promise.resolve({ data: [] } as any),
    brandsQuery,
  ]);

  if (searchRes.error) {
    console.warn("[liveSearch] products query error", searchRes.error);
  }

  const brands: LiveBrand[] = ((brandsRes?.data as any[]) ?? []).map((b) => ({
    id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url,
  }));

  const seen = new Set<string>();
  const ordered: any[] = [];
  // Preserve intent priority ordering
  if (explicitOrdered.length > 0) {
    const byId = new Map<string, any>();
    for (const r of (explicitRes.data ?? []) as any[]) byId.set(r.id, r);
    for (const id of explicitOrdered) {
      const r = byId.get(id);
      if (r && !seen.has(r.id)) { seen.add(r.id); ordered.push(r); }
    }
  }
  for (const r of (categoryRes.data ?? []) as any[]) {
    if (!seen.has(r.id)) { seen.add(r.id); ordered.push(r); }
  }
  for (const r of (searchRes.data ?? []) as any[]) {
    if (!seen.has(r.id)) { seen.add(r.id); ordered.push(r); }
  }

  // If a brand matched but no products by brand were returned, fetch products of that brand
  if (brands.length > 0) {
    const brandIds = brands.map((b) => b.id);
    const { data: brandProducts } = await supabase
      .from("products")
      .select(PRODUCT_COLS)
      .in("brand_id", brandIds)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .order("stock", { ascending: false })
      .limit(max * 2);
    for (const r of (brandProducts ?? []) as any[]) {
      if (!seen.has(r.id)) { seen.add(r.id); ordered.push(r); }
    }
  }

  const products = ordered.map(rowToProduct);

  let diagnostic: string | null = null;
  if (intentHit && intentIds.length > 0 && (explicitRes.data ?? []).length === 0) {
    diagnostic = `[liveSearch] intent ${intentHit.slug} tiene product_ids pero ningún producto activo/aprobado fue encontrado`;
    console.warn(diagnostic, {
      intent_slug: intentHit.slug,
      product_ids: intentIds,
      category_slug: matchedCategorySlug,
    });
  }

  const suggestions = Array.from(
    new Set([
      ...(intentHit ? [intentHit.name] : []),
      ...needHits.map((n) => n.name),
      ...maps.filter((m) => terms.some((t) => norm(m.keyword).includes(t))).map((m) => m.keyword),
      ...terms.filter((t) => t !== q),
    ]),
  ).slice(0, 8);

  return {
    products,
    suggestions,
    brands,
    totalEstimated: Math.max(searchRes.count ?? products.length, products.length),
    matchedNeedSlug: intentHit?.slug ?? matchedNeed?.slug ?? null,
    matchedNeedName: intentHit?.name ?? matchedNeed?.name ?? null,
    matchedCategorySlug,
    expandedTerms: terms,
    intentSlug: intentHit?.slug ?? null,
    intentTitle: intentHit?.title ?? null,
    intentCtaUrl: intentHit?.cta_url ?? null,
    intentCtaText: intentHit?.cta_text ?? null,
    intentHasProductIds: (intentIds.length ?? 0) > 0,
    diagnostic,
  };
}

export function invalidateLiveSearchCache() {
  cache = null;
}
