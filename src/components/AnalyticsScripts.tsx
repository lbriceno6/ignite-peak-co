// Reads analytics_settings and injects the matching tracking scripts.
// Mounted once near the root of the React tree.
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsConfig } from "@/lib/analytics";

function loadScript(id: string, src: string, attrs: Record<string, string> = {}) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function injectInlineScript(id: string, code: string) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.text = code;
  document.head.appendChild(s);
}

function injectGA4(measurementId: string) {
  loadScript("ga4-loader", `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  injectInlineScript("ga4-init", `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${measurementId}', { send_page_view: true });
  `);
}

function injectGTM(containerId: string) {
  injectInlineScript("gtm-init", `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `);
  // noscript fallback iframe
  if (typeof document !== "undefined" && !document.getElementById("gtm-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "gtm-noscript";
    ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.appendChild(ns);
  }
}

function injectPixel(pixelId: string) {
  injectInlineScript("fb-pixel-init", `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `);
  if (typeof document !== "undefined" && !document.getElementById("fb-pixel-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "fb-pixel-noscript";
    ns.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(ns);
  }
}

function injectGoogleAds(conversionId: string) {
  loadScript("gads-loader", `https://www.googletagmanager.com/gtag/js?id=${conversionId}`);
  injectInlineScript("gads-init", `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = window.gtag || gtag;
    window.gtag('js', new Date());
    window.gtag('config', '${conversionId}');
  `);
}

import { getConsent } from "@/lib/consent";

export const AnalyticsScripts = () => {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const consent = getConsent();
      const { data } = await supabase.from("analytics_settings" as any).select("*").eq("id", 1).maybeSingle();
      if (cancelled || !data) return;
      const cfg = data as AnalyticsConfig;
      window.__nbAnalyticsCfg = cfg;
      if (consent.analytics) {
        if (cfg.ga4_enabled !== false && cfg.ga4_measurement_id) injectGA4(cfg.ga4_measurement_id);
        if (cfg.gtm_enabled !== false && cfg.gtm_container_id) injectGTM(cfg.gtm_container_id);
      }
      if (consent.marketing) {
        if (cfg.pixel_enabled !== false && cfg.meta_pixel_id) injectPixel(cfg.meta_pixel_id);
        if (cfg.ads_enabled !== false && cfg.google_ads_conversion_id) injectGoogleAds(cfg.google_ads_conversion_id);
      }
    };
    run();
    const onChange = () => run();
    window.addEventListener("consent:changed", onChange);
    return () => { cancelled = true; window.removeEventListener("consent:changed", onChange); };
  }, []);
  return null;
};
