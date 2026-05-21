import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getSessionId } from "@/lib/visitor";
import { readCurrentAttribution, getFirstTouch } from "@/lib/attribution";
import { getDeviceInfo } from "@/lib/device";
import { getConsent } from "@/lib/consent";

export function useVisitorTracking() {
  const { pathname } = useLocation();

  useEffect(() => {
    const visitor_id = getVisitorId();
    const session_id = getSessionId();
    const consent = getConsent();
    const dev = getDeviceInfo();
    const first = getFirstTouch();
    const cur = readCurrentAttribution();

    const analyticsOk = consent.analytics;
    const marketingOk = consent.marketing;

    const payload: any = {
      visitor_id,
      session_id,
      current_page: pathname,
      last_page: pathname,
      consent_analytics: consent.analytics,
      consent_marketing: consent.marketing,
      consent_personalization: consent.personalization,
      updated_at: new Date().toISOString(),
    };

    if (analyticsOk) {
      payload.first_page = first.landing_page;
      payload.referrer = first.referrer;
      payload.source = first.source;
      payload.medium = first.medium;
      payload.campaign = first.campaign;
      payload.device_type = dev.device_type;
      payload.browser = dev.browser;
      payload.os = dev.os;
      payload.language = dev.language;
      payload.timezone = dev.timezone;
    }
    if (marketingOk) {
      payload.utm_source = cur.utm_source ?? first.utm_source;
      payload.utm_medium = cur.utm_medium ?? first.utm_medium;
      payload.utm_campaign = cur.utm_campaign ?? first.utm_campaign;
      payload.utm_content = cur.utm_content ?? first.utm_content;
      payload.utm_term = cur.utm_term ?? first.utm_term;
      payload.gclid = cur.gclid ?? first.gclid;
      payload.fbclid = cur.fbclid ?? first.fbclid;
      payload.ttclid = cur.ttclid ?? first.ttclid;
    }

    (supabase as any)
      .from("visitor_tracking")
      .upsert(payload, { onConflict: "visitor_id" })
      .then(({ error }: any) => {
        if (error) console.debug("visitor_tracking upsert", error);
      });
  }, [pathname]);
}
