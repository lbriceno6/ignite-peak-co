import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveShippingProvider = {
  id: string;
  name: string;
  estimated_days: string | null;
  sort_order: number;
};

export const useActiveShippingProviders = () => {
  const [providers, setProviders] = useState<ActiveShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("shipping_providers")
        .select("id,name,estimated_days,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!alive) return;
      setProviders((data as any) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { providers, loading };
};

export const resolveDeliveryText = (
  providers: ActiveShippingProvider[],
  providerId: string | undefined,
  fallback: string,
): string => {
  if (!providers || providers.length === 0) return fallback || "Entrega: 7–15 días hábiles";
  const picked = providerId ? providers.find((p) => p.id === providerId) : undefined;
  const chosen = picked ?? providers[0];
  const days = (chosen?.estimated_days || "").trim();
  if (!days) return fallback || "Entrega: 7–15 días hábiles";
  return `Entrega: ${days}`;
};
