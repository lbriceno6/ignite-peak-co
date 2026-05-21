// Lucía event logger. Inserts into public.lucia_events using anon client (RLS allows insert).
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getSessionId } from "./visitor";
import { readCurrentAttribution } from "./attribution";
import { getDeviceInfo } from "./device";
import { hasConsent } from "./consent";

export type LuciaEventType =
  | "lucia_chat_open"
  | "lucia_chat_message"
  | "lucia_product_recommendation"
  | "lucia_product_click"
  | "lucia_whatsapp_click"
  | "lucia_lead_captured";

export async function logLuciaEvent(
  event_type: LuciaEventType,
  data: {
    product_id?: string | null;
    product_slug?: string | null;
    page?: string | null;
    metadata?: Record<string, any>;
  } = {},
) {
  try {
    const attr = readCurrentAttribution();
    const dev = getDeviceInfo();
    const analyticsOk = hasConsent("analytics");

    await (supabase as any).from("lucia_events").insert({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type,
      product_id: data.product_id ?? null,
      product_slug: data.product_slug ?? null,
      page: data.page ?? (typeof window !== "undefined" ? window.location.pathname : null),
      source: analyticsOk ? attr.source : null,
      medium: analyticsOk ? attr.medium : null,
      campaign: analyticsOk ? attr.campaign : null,
      device_type: analyticsOk ? dev.device_type : null,
      metadata: data.metadata ?? {},
    });
  } catch (e) {
    // Silent — analytics must never break UX
    console.debug("logLuciaEvent failed", e);
  }
}
