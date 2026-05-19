import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "voltra.referral";
const EXPIRY_DAYS = 30;

export type StoredReferral = {
  reseller_id: string;
  source: "link" | "code";
  customer_discount_percent: number;
  code: string;
  link_slug: string;
  expires_at: number;
};

export const getStoredReferral = (): StoredReferral | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (parsed.expires_at < Date.now()) { localStorage.removeItem(STORAGE_KEY); return null; }
    return parsed;
  } catch { return null; }
};

export const clearReferral = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

export const applyReferralCode = async (raw: string): Promise<StoredReferral | null> => {
  const code = raw.trim();
  if (!code) return null;
  const { data, error } = await (supabase as any).rpc("resolve_referral", { _ref: code });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  const stored: StoredReferral = {
    reseller_id: row.reseller_id,
    source: row.source,
    customer_discount_percent: Number(row.customer_discount_percent ?? 0),
    code: row.code,
    link_slug: row.link_slug,
    expires_at: Date.now() + EXPIRY_DAYS * 86400000,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch {}
  return stored;
};

export const ReferralTracker = () => {
  const loc = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const ref = params.get("ref");
    if (ref) {
      void applyReferralCode(ref);
    }
  }, [loc.search]);
  return null;
};
