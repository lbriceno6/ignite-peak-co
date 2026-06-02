import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PricingResult = {
  segment_code: string;
  segment_name?: string;
  discount_percent: number;
  message: string | null;
  rule?: any;
};

const CACHE_KEY = "nb_dynamic_pricing_v1";
const TTL_MS = 1000 * 60 * 10;

export const useDynamicPricing = (context: Record<string, any> = {}) => {
  const [data, setData] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id ?? null;
      const cacheKey = `${CACHE_KEY}:${userId ?? "anon"}:${JSON.stringify(context)}`;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const { ts, payload } = JSON.parse(raw);
          if (Date.now() - ts < TTL_MS) {
            if (alive) { setData(payload); setLoading(false); }
            return;
          }
        }
      } catch {}
      let sessionId = sessionStorage.getItem("nb_sid");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("nb_sid", sessionId);
      }
      const { data: res, error } = await supabase.functions.invoke("ai-dynamic-pricing", {
        body: { action: "evaluate", user_id: userId, session_id: sessionId, context },
      });
      if (!alive) return;
      if (error || !res) { setData(null); setLoading(false); return; }
      setData(res as PricingResult);
      setLoading(false);
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: res })); } catch {}
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  return { data, loading };
};
