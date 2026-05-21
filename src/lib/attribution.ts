// Parse attribution from URL + referrer. Persist first-touch in localStorage.
export type Attribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landing_page: string | null;
};

const FIRST_KEY = "nutribatidos_first_touch";

function detectSource(p: URLSearchParams, referrer: string): { source: string; medium: string } {
  const utmS = p.get("utm_source")?.toLowerCase();
  const utmM = p.get("utm_medium")?.toLowerCase() ?? "";
  if (p.get("gclid")) return { source: "Google Ads", medium: "cpc" };
  if (p.get("fbclid")) return { source: "Meta Ads", medium: "cpc" };
  if (p.get("ttclid")) return { source: "TikTok Ads", medium: "cpc" };
  if (utmS) {
    if (utmS.includes("facebook") || utmS.includes("instagram") || utmS.includes("meta"))
      return { source: "Meta", medium: utmM || "social" };
    if (utmS.includes("google")) return { source: "Google", medium: utmM || "cpc" };
    if (utmS.includes("tiktok")) return { source: "TikTok", medium: utmM || "social" };
    return { source: utmS, medium: utmM || "referral" };
  }
  const r = (referrer || "").toLowerCase();
  if (r.includes("google.")) return { source: "Google Organic", medium: "organic" };
  if (r.includes("facebook.") || r.includes("instagram.")) return { source: "Meta Social", medium: "social" };
  if (r.includes("whatsapp") || r.includes("wa.me")) return { source: "WhatsApp", medium: "messaging" };
  if (r.includes("tiktok.")) return { source: "TikTok", medium: "social" };
  if (r) return { source: "Referral", medium: "referral" };
  return { source: "Directo", medium: "none" };
}

export function readCurrentAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {
      source: null, medium: null, campaign: null,
      utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
      gclid: null, fbclid: null, ttclid: null, referrer: null, landing_page: null,
    };
  }
  const p = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";
  const { source, medium } = detectSource(p, referrer);
  return {
    source,
    medium,
    campaign: p.get("utm_campaign"),
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    utm_content: p.get("utm_content"),
    utm_term: p.get("utm_term"),
    gclid: p.get("gclid"),
    fbclid: p.get("fbclid"),
    ttclid: p.get("ttclid"),
    referrer: referrer || null,
    landing_page: window.location.pathname,
  };
}

export function getFirstTouch(): Attribution {
  if (typeof window === "undefined") return readCurrentAttribution();
  try {
    const stored = localStorage.getItem(FIRST_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const fresh = readCurrentAttribution();
  localStorage.setItem(FIRST_KEY, JSON.stringify(fresh));
  return fresh;
}
