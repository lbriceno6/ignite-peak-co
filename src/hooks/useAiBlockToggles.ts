import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AiBlockKey =
  | "home_dynamic_banner"
  | "home_recommended"
  | "home_recently_viewed"
  | "cart_recommendations"
  | "checkout_recommendations"
  | "intelligent_search"
  | "product_why_for_you"
  | "product_ai_related"
  | "post_purchase_insights";

export type AiBlockToggle = {
  block_key: AiBlockKey;
  enabled: boolean;
  label: string;
  description: string | null;
};

// In-memory cache so toggles don't re-fetch per component mount.
let cache: Record<string, boolean> | null = null;
let cachePromise: Promise<Record<string, boolean>> | null = null;

async function loadToggles(): Promise<Record<string, boolean>> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const { data } = await (supabase as any)
      .from("ai_block_toggles")
      .select("block_key,enabled");
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      map[r.block_key] = r.enabled !== false;
    });
    cache = map;
    return map;
  })();
  return cachePromise;
}

export function invalidateAiBlockToggles() {
  cache = null;
  cachePromise = null;
}

export function useAiBlockEnabled(key: AiBlockKey, defaultValue = true) {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);
  useEffect(() => {
    let alive = true;
    loadToggles().then((map) => {
      if (!alive) return;
      if (key in map) setEnabled(map[key]);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return enabled;
}

export function useAllAiBlockToggles() {
  const [rows, setRows] = useState<AiBlockToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("ai_block_toggles")
      .select("*")
      .order("block_key");
    setRows((data ?? []) as AiBlockToggle[]);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);
  return { rows, loading, reload };
}
