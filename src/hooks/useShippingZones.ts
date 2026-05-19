import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShippingZone = {
  id: string;
  name: string;
  cities: string[];
  cost: number;
  estimated_days: string | null;
  free_threshold: number | null;
  sort_order: number;
  is_active: boolean;
};

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const matchZone = (city: string, zones: ShippingZone[]): ShippingZone | null => {
  const c = norm(city);
  if (!c) return null;
  // exact city match first
  for (const z of zones) {
    if ((z.cities || []).some((x) => norm(x) === c)) return z;
  }
  // partial: city contains a known city or vice versa
  for (const z of zones) {
    if ((z.cities || []).some((x) => {
      const n = norm(x);
      return n && (c.includes(n) || n.includes(c));
    })) return z;
  }
  return null;
};

export const computeZoneShipping = (
  zone: ShippingZone | null,
  subtotal: number,
  fallback: { freeThreshold: number; baseCost: number },
) => {
  if (subtotal === 0) return 0;
  if (zone) {
    const threshold = zone.free_threshold ?? fallback.freeThreshold;
    if (threshold > 0 && subtotal > threshold) return 0;
    return Number(zone.cost) || 0;
  }
  return subtotal > fallback.freeThreshold ? 0 : fallback.baseCost;
};

export const useShippingZones = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("shipping_zones")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!alive) return;
      setZones((data as ShippingZone[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { zones, loading };
};
