// Analytics dispatcher: fans events out to GA4 (gtag), GTM (dataLayer), and Meta Pixel (fbq).
// Insert events also persist to product_events for the in-app performance dashboard.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    __nbAnalyticsCfg?: AnalyticsConfig | null;
  }
}

export type AnalyticsConfig = {
  ga4_measurement_id?: string | null;
  gtm_container_id?: string | null;
  meta_pixel_id?: string | null;
  google_ads_conversion_id?: string | null;
  google_ads_conversion_label?: string | null;
  ga4_enabled?: boolean;
  gtm_enabled?: boolean;
  pixel_enabled?: boolean;
  ads_enabled?: boolean;
};

export type TrackEvent =
  | "view_item" | "search" | "select_item" | "add_to_cart"
  | "begin_checkout" | "purchase" | "whatsapp_click" | "landing_page_view";

const PIXEL_MAP: Partial<Record<TrackEvent, string>> = {
  view_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("nb_sid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("nb_sid", id);
  }
  return id;
}

export function track(event: TrackEvent, payload: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  // GTM dataLayer (always available, no-op if GTM not loaded)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });

  // GA4
  if (window.gtag) {
    try { window.gtag("event", event, payload); } catch {}
  }

  // Meta Pixel
  const pxEvent = PIXEL_MAP[event];
  if (pxEvent && window.fbq) {
    try { window.fbq("track", pxEvent, payload); } catch {}
  }

  // Google Ads conversion for purchase
  if (event === "purchase" && window.gtag) {
    const cfg = window.__nbAnalyticsCfg;
    if (cfg?.ads_enabled && cfg.google_ads_conversion_id && cfg.google_ads_conversion_label) {
      try {
        window.gtag("event", "conversion", {
          send_to: `${cfg.google_ads_conversion_id}/${cfg.google_ads_conversion_label}`,
          value: payload.value,
          currency: payload.currency ?? "USD",
          transaction_id: payload.transaction_id,
        });
      } catch {}
    }
  }

  // Persist to product_events (fire-and-forget)
  const row = {
    event_type: event,
    product_id: payload.product_id ?? null,
    product_slug: payload.product_slug ?? null,
    landing_slug: payload.landing_slug ?? null,
    session_id: getSessionId(),
    value: typeof payload.value === "number" ? payload.value : null,
    metadata: payload,
  };
  // Strip nulls from metadata copy to keep it light
  supabase.from("product_events" as any).insert(row).then(() => {}, () => {});
}
