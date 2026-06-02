// Lightweight browse-event logger that REUSES public.lucia_events.
// Used by the Home Inteligente IA layer to track product views,
// category views, searches, and add-to-cart events.
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getSessionId } from "./visitor";

export type BrowseEventType =
  | "browse_product_view"
  | "browse_category_view"
  | "browse_search"
  | "browse_add_to_cart";

export async function logBrowseEvent(
  event_type: BrowseEventType,
  data: {
    product_id?: string | null;
    product_slug?: string | null;
    category_slug?: string | null;
    search_query?: string | null;
    page?: string | null;
    metadata?: Record<string, any>;
  } = {},
) {
  try {
    await (supabase as any).from("lucia_events").insert({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type,
      product_id: data.product_id ?? null,
      product_slug: data.product_slug ?? null,
      page: data.page ?? (typeof window !== "undefined" ? window.location.pathname : null),
      metadata: {
        ...(data.metadata ?? {}),
        category_slug: data.category_slug ?? null,
        search_query: data.search_query ?? null,
      },
    });
  } catch (e) {
    console.debug("logBrowseEvent failed", e);
  }
}
