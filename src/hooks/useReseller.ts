import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Reseller = {
  id: string;
  user_id: string;
  code: string;
  link_slug: string;
  tier_id: string | null;
  total_sales: number;
  total_commission: number;
  balance_cash: number;
  balance_credit: number;
  payout_method: "cash" | "credit" | "choose";
  payout_account: string | null;
  is_active: boolean;
};

export type ResellerTier = {
  id: string;
  name: string;
  min_sales: number;
  commission_percent: number;
  customer_discount_percent: number;
  sort_order: number;
  is_active: boolean;
};

export const useReseller = () => {
  const { user, loading: authLoading } = useAuth();
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [tier, setTier] = useState<ResellerTier | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setReseller(null); setTier(null); setLoading(false); return; }
    setLoading(true);
    const { data: r } = await (supabase as any)
      .from("resellers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setReseller(r ?? null);
    if (r?.tier_id) {
      const { data: t } = await (supabase as any).from("reseller_tiers").select("*").eq("id", r.tier_id).maybeSingle();
      setTier(t ?? null);
    } else { setTier(null); }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const activate = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("activate_reseller");
    if (error) throw error;
    await load();
    return data as Reseller;
  }, [load]);

  return { reseller, tier, loading, isReseller: !!reseller, refresh: load, activate };
};
