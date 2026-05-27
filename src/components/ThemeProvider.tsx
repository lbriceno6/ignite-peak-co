import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  THEME_KEYS,
  THEME_DEFAULTS,
  applyTheme,
  applyMode,
  getStoredMode,
  type ThemeKey,
} from "@/lib/theme";

const CACHE_KEY = "lovable-theme-cache-v1";

const readCache = (): Partial<Record<ThemeKey, string>> | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (map: Partial<Record<ThemeKey, string>>) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

// Apply cached theme + mode synchronously at module load, before React renders.
// This prevents a "flash" of default colors on refresh.
if (typeof document !== "undefined") {
  applyMode(getStoredMode());
  const cached = readCache();
  applyTheme(cached ?? THEME_DEFAULTS);
}

const loadAndApply = async () => {
  const { data } = await supabase
    .from("site_content")
    .select("key,value")
    .in("key", THEME_KEYS as unknown as string[]);
  const map: Partial<Record<ThemeKey, string>> = { ...THEME_DEFAULTS };
  (data ?? []).forEach((r: any) => {
    if (r.value !== null && r.value !== undefined) map[r.key as ThemeKey] = r.value as string;
  });
  applyTheme(map);
  writeCache(map);
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Re-apply stored light/dark preference (in case it changed in another tab)
    applyMode(getStoredMode());

    let alive = true;
    (async () => {
      await loadAndApply();
      if (!alive) return;
    })();

    // React to system-mode changes if user picked "system"
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (getStoredMode() === "system") applyMode("system");
    };
    mql.addEventListener?.("change", onSystem);

    const ch = supabase
      .channel("theme-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (row?.key && (THEME_KEYS as readonly string[]).includes(row.key)) {
            loadAndApply();
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      mql.removeEventListener?.("change", onSystem);
      supabase.removeChannel(ch);
    };
  }, []);

  return <>{children}</>;
};
