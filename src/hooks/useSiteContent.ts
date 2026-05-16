import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteContentMap = Record<string, string>;

export const useSiteContent = (keys: string[], defaults: SiteContentMap = {}) => {
  const [map, setMap] = useState<SiteContentMap>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("site_content").select("key,value").in("key", keys);
      if (!alive) return;
      const next = { ...defaults };
      (data ?? []).forEach((r: any) => {
        if (r.value !== null && r.value !== undefined && r.value !== "") next[r.key] = r.value;
      });
      setMap(next);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join("|")]);

  return { content: map, loading };
};
