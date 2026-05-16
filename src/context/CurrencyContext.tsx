import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "EUR" | "USD" | "PEN";

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string; flag: string; rate: number }> = {
  // Base currency is EUR (database prices are stored in EUR). Rates are EUR -> X.
  EUR: { label: "Euro", symbol: "€", flag: "🇪🇺", rate: 1 },
  USD: { label: "US Dollar", symbol: "$", flag: "🇺🇸", rate: 1.08 },
  PEN: { label: "Sol peruano", symbol: "S/", flag: "🇵🇪", rate: 4.05 },
};

export const DEFAULT_CURRENCY_KEY = "site.currency.default";
export const FALLBACK_CURRENCY: CurrencyCode = "PEN";

type Ctx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  format: (eurAmount: number) => string;
  convert: (eurAmount: number) => number;
};

const CurrencyContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "voltra.currency";
const USER_CHOSE_KEY = "voltra.currency.userChose";

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return FALLBACK_CURRENCY;
    const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return saved && CURRENCIES[saved] ? saved : FALLBACK_CURRENCY;
  });

  // Load admin-configured default currency. Only override if the user hasn't
  // manually selected a currency yet (so user choice persists across reloads).
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", DEFAULT_CURRENCY_KEY)
        .maybeSingle();
      if (!alive) return;
      const adminDefault = (data?.value ?? "").toUpperCase() as CurrencyCode;
      if (CURRENCIES[adminDefault] && localStorage.getItem(USER_CHOSE_KEY) !== "1") {
        setCurrencyState(adminDefault);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = useCallback((c: CurrencyCode) => {
    localStorage.setItem(USER_CHOSE_KEY, "1");
    setCurrencyState(c);
  }, []);

  const value = useMemo<Ctx>(() => {
    const meta = CURRENCIES[currency];
    const convert = (eur: number) => eur * meta.rate;
    const format = (eur: number) => {
      const v = convert(eur);
      const n = v.toFixed(2);
      return currency === "PEN" ? `${meta.symbol} ${n}` : `${meta.symbol}${n}`;
    };
    return { currency, setCurrency, symbol: meta.symbol, format, convert };
  }, [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
