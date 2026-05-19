import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { THEME_KEYS, THEME_DEFAULTS, applyTheme, type ThemeKey } from "@/lib/theme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key,value")
        .in("key", THEME_KEYS as unknown as string[]);
      if (!alive) return;
      const map: Partial<Record<ThemeKey, string>> = { ...THEME_DEFAULTS };
      (data ?? []).forEach((r: any) => {
        if (r.value) map[r.key as ThemeKey] = r.value as string;
      });
      applyTheme(map);
    })();

    // Realtime updates so changes from admin reflect immediately
    const ch = supabase
      .channel("theme-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (row?.key && (THEME_KEYS as readonly string[]).includes(row.key)) {
            // Re-fetch everything (simpler than diffing)
            supabase
              .from("site_content")
              .select("key,value")
              .in("key", THEME_KEYS as unknown as string[])
              .then(({ data }) => {
                const map: Partial<Record<ThemeKey, string>> = { ...THEME_DEFAULTS };
                (data ?? []).forEach((r: any) => {
                  if (r.value) map[r.key as ThemeKey] = r.value as string;
                });
                applyTheme(map);
              });
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return <>{children}</>;
};
