import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion, PromotionVariant } from "@/lib/promotions";

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
    variant: (p.variant as PromotionVariant) || (p.benefit_type as PromotionVariant) || "second_discount",
    discount_percent: Number(p.discount_percent ?? 0),
    discount_amount: Number(p.discount_amount ?? 0),
    min_quantity: Number(p.min_quantity ?? 2),
    priority: Number(p.priority ?? 0),
    badge_label: p.badge_label ?? null,
    benefit_message: p.benefit_message ?? null,
    cart_msg_applied: p.cart_msg_applied ?? null,
    cart_msg_progress: p.cart_msg_progress ?? null,
    start_date: p.start_date,
    end_date: p.end_date,
    usage_limit_per_order: Number(p.usage_limit_per_order ?? 1),
    show_on_home: !!p.show_on_home,
    show_on_product: !!p.show_on_product,
    show_in_carousel: p.show_in_carousel == null ? true : !!p.show_in_carousel,
    sort_order_home: Number(p.sort_order_home ?? 0),
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
