import { supabase } from "@/integrations/supabase/client";

export async function logSearch(opts: {
  query: string;
  resultsCount: number;
  userId?: string | null;
}) {
  const q = (opts.query || "").trim();
  if (!q) return;
  try {
    await supabase.from("search_logs" as any).insert({
      query: q,
      results_count: opts.resultsCount,
      user_id: opts.userId ?? null,
    });
    // If zero results, also bump synonyms suggestion bucket
    if (opts.resultsCount === 0) {
      const lower = q.toLowerCase();
      const { data: existing } = await supabase
        .from("seo_synonyms" as any)
        .select("id, hits")
        .eq("term", lower)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("seo_synonyms" as any)
          .update({ hits: ((existing as any).hits ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", (existing as any).id);
      } else {
        await supabase.from("seo_synonyms" as any).insert({ term: lower, hits: 1, status: "pending" });
      }
    }
  } catch {
    /* analytics is best-effort */
  }
}

export async function logSearchClick(opts: {
  query: string;
  productId: string;
  productSlug: string;
  userId?: string | null;
}) {
  try {
    await supabase.from("search_logs" as any).insert({
      query: opts.query,
      results_count: 1,
      clicked_product_id: opts.productId,
      clicked_product_slug: opts.productSlug,
      user_id: opts.userId ?? null,
    });
  } catch {
    /* noop */
  }
}
