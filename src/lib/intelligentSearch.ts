import { supabase } from "@/integrations/supabase/client";

export type SmartSearchResult = {
  source: "exact" | "need" | "ai" | "none";
  need?: string | null;
  need_slug?: string | null;
  category_slug?: string | null;
  product_ids?: string[];
  ai_products?: string[];
  message?: string | null;
  fallback_whatsapp?: boolean;
};

export const normalizeQuery = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function intelligentSearch(query: string): Promise<SmartSearchResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const { data, error } = await supabase.functions.invoke("intelligent-search", {
      body: { query: q },
    });
    if (error) {
      console.warn("intelligentSearch error", error);
      return null;
    }
    return data as SmartSearchResult;
  } catch (e) {
    console.warn("intelligentSearch failed", e);
    return null;
  }
}

export function buildSearchDestination(
  query: string,
  result: SmartSearchResult | null,
): string {
  if (result?.category_slug) {
    const params = new URLSearchParams();
    if (result.need_slug) params.set("necesidad", result.need_slug);
    params.set("categoria", result.category_slug);
    params.set("q", query);
    return `/buscar?${params.toString()}`;
  }
  if (result?.need_slug) {
    return `/buscar?necesidad=${encodeURIComponent(result.need_slug)}&q=${encodeURIComponent(query)}`;
  }
  return `/buscar?q=${encodeURIComponent(query)}`;
}
