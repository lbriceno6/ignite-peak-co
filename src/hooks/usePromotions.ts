import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion } from "@/lib/promotions";

let cache: Promotion[] | null = null;
let cachedAt = 0;
const TTL = 60_000;
const listeners = new Set<(p: Promotion[]) => void>();

const fetchPromotions = async (): Promise<Promotion[]> => {
  const { data: promos, error } = await (supabase as any)
    .from("promotions")
    .select("*")
    .eq("is_active", true);
  if (error || !promos) return [];
  const ids = promos.map((p: any) => p.id);
  if (!ids.length) return [];
  const { data: links } = await (supabase as any)
    .from("promotion_products")
    .select("promotion_id,product_id")
    .in("promotion_id", ids);
  const byPromo = new Map<string, string[]>();
  (links ?? []).forEach((l: any) => {
    const arr = byPromo.get(l.promotion_id) ?? [];
    arr.push(l.product_id);
    byPromo.set(l.promotion_id, arr);
  });
  return promos.map((p: any) => ({
    id: p.id,
    name: p.name,
    benefit_type: p.benefit_type,
    discount_percent: Number(p.discount_percent ?? 0),
    start_date: p.start_date,
    end_date: p.end_date,
    usage_limit_per_order: Number(p.usage_limit_per_order ?? 1),
    show_on_home: !!p.show_on_home,
    show_on_product: !!p.show_on_product,
    is_active: !!p.is_active,
    product_ids: byPromo.get(p.id) ?? [],
  })) as Promotion[];
};

export const usePromotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    const update = (p: Promotion[]) => mounted && setPromotions(p);
    listeners.add(update);
    const now = Date.now();
    if (!cache || now - cachedAt > TTL) {
      setLoading(true);
      fetchPromotions().then((p) => {
        cache = p;
        cachedAt = Date.now();
        listeners.forEach((l) => l(p));
        if (mounted) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
      listeners.delete(update);
    };
  }, []);

  return { promotions, loading };
};

export const invalidatePromotionsCache = async () => {
  cache = null;
  cachedAt = 0;
  const fresh = await fetchPromotions();
  cache = fresh;
  cachedAt = Date.now();
  listeners.forEach((l) => l(fresh));
};
