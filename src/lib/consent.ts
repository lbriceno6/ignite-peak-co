// Cookie consent management. Stored in localStorage as JSON.
export type ConsentCategory = "necessary" | "analytics" | "marketing" | "personalization";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  accepted_at: string | null;
  decided: boolean;
};

const KEY = "cookie_consent";

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
  accepted_at: null,
  decided: false,
};

export function getConsent(): CookieConsent {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONSENT, ...parsed, necessary: true };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function setConsent(c: Partial<CookieConsent>) {
  const next: CookieConsent = {
    ...getConsent(),
    ...c,
    necessary: true,
    accepted_at: new Date().toISOString(),
    decided: true,
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("consent:changed", { detail: next }));
  return next;
}

export function acceptAll() {
  return setConsent({ analytics: true, marketing: true, personalization: true });
}

export function rejectAll() {
  return setConsent({ analytics: false, marketing: false, personalization: false });
}

export function hasConsent(cat: ConsentCategory): boolean {
  return !!getConsent()[cat];
}

export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent("consent:open"));
}
