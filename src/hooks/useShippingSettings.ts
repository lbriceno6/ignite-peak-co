import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { shippingSettings } from "@/store/cart";

const KEYS = ["shipping_free_threshold", "shipping_default_cost"];

let loaded = false;

export const useShippingSettings = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("site_content").select("key,value").in("key", KEYS);
      if (!alive || !data) return;
      data.forEach((r: any) => {
        const v = parseFloat(r.value);
        if (!Number.isFinite(v)) return;
        if (r.key === "shipping_free_threshold") shippingSettings.freeThreshold = v;
        if (r.key === "shipping_default_cost") shippingSettings.baseCost = v;
      });
      loaded = true;
      setTick((t) => t + 1);
    })();

    const channel = supabase
      .channel("shipping-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!row?.key || !KEYS.includes(row.key)) return;
        const v = parseFloat((payload.new as any)?.value ?? "");
        if (!Number.isFinite(v)) return;
        if (row.key === "shipping_free_threshold") shippingSettings.freeThreshold = v;
        if (row.key === "shipping_default_cost") shippingSettings.baseCost = v;
        setTick((t) => t + 1);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return { ...shippingSettings, loaded, tick };
};
