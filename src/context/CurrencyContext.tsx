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
export const RATE_KEY_PREFIX = "site.currency.rate.";
export const rateKey = (c: CurrencyCode) => `${RATE_KEY_PREFIX}${c}`;
export const FALLBACK_CURRENCY: CurrencyCode = "PEN";

type Rates = Record<CurrencyCode, number>;

type Ctx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  rates: Rates;
  format: (eurAmount: number) => string;
  convert: (eurAmount: number) => number;
};

const CurrencyContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "voltra.currency";
const USER_CHOSE_KEY = "voltra.currency.userChose";

const defaultRates = (): Rates => ({
  EUR: CURRENCIES.EUR.rate,
  USD: CURRENCIES.USD.rate,
  PEN: CURRENCIES.PEN.rate,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return FALLBACK_CURRENCY;
    const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return saved && CURRENCIES[saved] ? saved : FALLBACK_CURRENCY;
  });
  const [rates, setRates] = useState<Rates>(defaultRates);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key,value")
        .or(`key.eq.${DEFAULT_CURRENCY_KEY},key.like.${RATE_KEY_PREFIX}%`);
      if (!alive || !data) return;
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.key] = r.value ?? ""; });

      const next = defaultRates();
      (Object.keys(next) as CurrencyCode[]).forEach((c) => {
        const v = parseFloat(map[rateKey(c)] ?? "");
        if (Number.isFinite(v) && v > 0) next[c] = v;
      });
      setRates(next);

      const adminDefault = (map[DEFAULT_CURRENCY_KEY] ?? "").toUpperCase() as CurrencyCode;
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
    const rate = rates[currency] ?? meta.rate;
    const convert = (eur: number) => eur * rate;
    const format = (eur: number) => {
      const n = convert(eur).toFixed(2);
      return currency === "PEN" ? `${meta.symbol} ${n}` : `${meta.symbol}${n}`;
    };
    return { currency, setCurrency, symbol: meta.symbol, rates, format, convert };
  }, [currency, rates, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
