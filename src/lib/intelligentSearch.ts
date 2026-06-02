import { supabase } from "@/integrations/supabase/client";
import { logBrowseEvent } from "@/lib/recoEvents";

export type SmartSearchResult = {
  source: "exact" | "need" | "ai" | "none";
  need?: string | null;
  need_slug?: string | null;
  category_slug?: string | null;
  product_ids?: string[];
  ai_products?: string[];
  message?: string | null;
  fallback_whatsapp?: boolean;
  // Enrichment when a purchase_intents row matched
  intent_slug?: string | null;
  intent_title?: string | null;
  intent_subtitle?: string | null;
  intent_banner?: string | null;
  intent_cta_text?: string | null;
  intent_cta_url?: string | null;
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
    const result = data as SmartSearchResult;
    // Fire-and-forget browse tracking for Home Inteligente IA
    void logBrowseEvent("browse_search", {
      search_query: q,
      category_slug: result?.category_slug ?? null,
      metadata: {
        source: result?.source ?? null,
        intent_slug: result?.intent_slug ?? result?.need_slug ?? null,
      },
    });
    return result;
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
    if (result.intent_slug) params.set("intencion", result.intent_slug);
    params.set("categoria", result.category_slug);
    params.set("q", query);
    return `/buscar?${params.toString()}`;
  }
  if (result?.intent_slug) {
    return `/buscar?intencion=${encodeURIComponent(result.intent_slug)}&q=${encodeURIComponent(query)}`;
  }
  if (result?.need_slug) {
    return `/buscar?necesidad=${encodeURIComponent(result.need_slug)}&q=${encodeURIComponent(query)}`;
  }
  return `/buscar?q=${encodeURIComponent(query)}`;
}
