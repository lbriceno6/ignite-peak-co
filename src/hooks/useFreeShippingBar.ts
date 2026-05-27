import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FreeShippingSettings = {
  enabled: boolean;
  threshold: number;
  baseCost: number;
  showBar: boolean;
  showCart: boolean;
  showMinicart: boolean;
  showPdp: boolean;
  textInitial: string;
  textProgress: string;
  textNear: string;
  textSuccess: string;
  barColor: string;
  barBg: string;
  blockBg: string;
};

export const FREE_SHIPPING_KEYS = [
  "shipping_free_enabled",
  "shipping_free_threshold",
  "shipping_default_cost",
  "shipping_free_bar_show",
  "shipping_free_show_cart",
  "shipping_free_show_minicart",
  "shipping_free_show_pdp",
  "shipping_free_text_initial",
  "shipping_free_text_progress",
  "shipping_free_text_near",
  "shipping_free_text_success",
  "shipping_free_bar_color",
  "shipping_free_bar_bg",
  "shipping_free_block_bg",
] as const;

export const DEFAULT_FREE_SHIPPING: FreeShippingSettings = {
  enabled: true,
  threshold: 99,
  baseCost: 10,
  showBar: true,
  showCart: true,
  showMinicart: true,
  showPdp: true,
  textInitial: "Envío gratis desde S/ {monto_minimo}",
  textProgress: "Agrega S/ {monto_faltante} más y obtén envío gratis.",
  textNear: "¡Ya te falta poco! Solo S/ {monto_faltante} más para envío gratis.",
  textSuccess: "¡Felicidades! Tu pedido ya tiene envío gratis.",
  barColor: "#35A936",
  barBg: "#D8EFD6",
  blockBg: "#EAF8E8",
};

const parseBool = (v: string | undefined, fallback: boolean) =>
  v == null || v === "" ? fallback : v === "1" || v === "true";
const parseNum = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
};

const fromMap = (m: Record<string, string>): FreeShippingSettings => ({
  enabled: parseBool(m["shipping_free_enabled"], DEFAULT_FREE_SHIPPING.enabled),
  threshold: parseNum(m["shipping_free_threshold"], DEFAULT_FREE_SHIPPING.threshold),
  baseCost: parseNum(m["shipping_default_cost"], DEFAULT_FREE_SHIPPING.baseCost),
  showBar: parseBool(m["shipping_free_bar_show"], DEFAULT_FREE_SHIPPING.showBar),
  showCart: parseBool(m["shipping_free_show_cart"], DEFAULT_FREE_SHIPPING.showCart),
  showMinicart: parseBool(m["shipping_free_show_minicart"], DEFAULT_FREE_SHIPPING.showMinicart),
  showPdp: parseBool(m["shipping_free_show_pdp"], DEFAULT_FREE_SHIPPING.showPdp),
  textInitial: m["shipping_free_text_initial"] || DEFAULT_FREE_SHIPPING.textInitial,
  textProgress: m["shipping_free_text_progress"] || DEFAULT_FREE_SHIPPING.textProgress,
  textNear: m["shipping_free_text_near"] || DEFAULT_FREE_SHIPPING.textNear,
  textSuccess: m["shipping_free_text_success"] || DEFAULT_FREE_SHIPPING.textSuccess,
  barColor: m["shipping_free_bar_color"] || DEFAULT_FREE_SHIPPING.barColor,
  barBg: m["shipping_free_bar_bg"] || DEFAULT_FREE_SHIPPING.barBg,
  blockBg: m["shipping_free_block_bg"] || DEFAULT_FREE_SHIPPING.blockBg,
});

export const useFreeShippingBar = () => {
  const [settings, setSettings] = useState<FreeShippingSettings>(DEFAULT_FREE_SHIPPING);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key,value")
        .in("key", FREE_SHIPPING_KEYS as unknown as string[]);
      if (!alive || !data) return;
      const m: Record<string, string> = {};
      data.forEach((r: any) => (m[r.key] = r.value ?? ""));
      setSettings(fromMap(m));
    })();

    const channel = supabase
      .channel(`free-shipping-settings-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!row?.key || !(FREE_SHIPPING_KEYS as readonly string[]).includes(row.key)) return;
        (async () => {
          const { data } = await supabase
            .from("site_content")
            .select("key,value")
            .in("key", FREE_SHIPPING_KEYS as unknown as string[]);
          if (!alive || !data) return;
          const m: Record<string, string> = {};
          data.forEach((r: any) => (m[r.key] = r.value ?? ""));
          setSettings(fromMap(m));
        })();
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return settings;
};

export const formatMoney = (n: number) => `S/ ${Math.max(0, n).toFixed(2)}`;

export const interpolateMessage = (
  tpl: string,
  threshold: number,
  remaining: number,
) =>
  tpl
    .replace(/\{monto_minimo\}/g, threshold.toFixed(2))
    .replace(/\{monto_faltante\}/g, remaining.toFixed(2));

export const pickMessage = (
  s: FreeShippingSettings,
  subtotal: number,
): { message: string; progress: number; achieved: boolean; remaining: number } => {
  const threshold = s.threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;
  const achieved = threshold > 0 && subtotal >= threshold;
  let message: string;
  if (subtotal <= 0) {
    message = interpolateMessage(s.textInitial, threshold, remaining);
  } else if (achieved) {
    message = s.textSuccess;
  } else if (progress >= 90) {
    message = interpolateMessage(s.textNear, threshold, remaining);
  } else if (progress >= 50) {
    message = interpolateMessage(
      "Vas muy bien. Te faltan S/ {monto_faltante} para envío gratis.",
      threshold,
      remaining,
    );
  } else {
    message = interpolateMessage(s.textProgress, threshold, remaining);
  }
  return { message, progress, achieved, remaining };
};
