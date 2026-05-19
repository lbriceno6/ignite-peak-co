import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionSettings = {
  enabled: boolean;
  label: string;
  cancelNote: string;
  defaultDiscount: number;
  defaultIntervals: number[];
  benefits: string[];
};

export const SUB_KEYS = [
  "sub.enabled",
  "sub.label",
  "sub.cancel_note",
  "sub.default_discount",
  "sub.default_intervals",
  "sub.benefits",
] as const;

export const DEFAULT_SUB_SETTINGS: SubscriptionSettings = {
  enabled: true,
  label: "Suscríbete y ahorra",
  cancelNote: "cancela cuando quieras",
  defaultDiscount: 10,
  defaultIntervals: [30, 60, 90],
  benefits: [
    "Descuento automático en cada envío",
    "Recíbelo en la frecuencia que elijas",
    "Pausa o cancela cuando quieras",
  ],
};

export const parseSubSettings = (rows: { key: string; value: string }[] | null | undefined): SubscriptionSettings => {
  const map: Record<string, string> = {};
  (rows ?? []).forEach((r) => { map[r.key] = r.value ?? ""; });
  const intervals = (map["sub.default_intervals"] || "")
    .split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
  const benefits = (map["sub.benefits"] || "")
    .split("\n").map((s) => s.trim()).filter(Boolean);
  return {
    enabled: map["sub.enabled"] !== "0",
    label: map["sub.label"] || DEFAULT_SUB_SETTINGS.label,
    cancelNote: map["sub.cancel_note"] || DEFAULT_SUB_SETTINGS.cancelNote,
    defaultDiscount: Number(map["sub.default_discount"]) || DEFAULT_SUB_SETTINGS.defaultDiscount,
    defaultIntervals: intervals.length ? intervals : DEFAULT_SUB_SETTINGS.defaultIntervals,
    benefits: benefits.length ? benefits : DEFAULT_SUB_SETTINGS.benefits,
  };
};

export function useSubscriptionSettings() {
  const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SUB_SETTINGS);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("site_content").select("key,value").in("key", SUB_KEYS as unknown as string[]);
      if (alive) setSettings(parseSubSettings(data as any));
    };
    load();
    const ch = supabase
      .channel("sub-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (p: any) => {
        if (p?.new?.key?.startsWith?.("sub.") || p?.old?.key?.startsWith?.("sub.")) load();
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  return settings;
}
