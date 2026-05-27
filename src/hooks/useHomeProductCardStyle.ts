import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STYLE, STYLE_KEY, parseStyle, type HomeProductCardStyle } from "@/lib/homeProductCardStyle";

export const useHomeProductCardStyle = () => {
  const [style, setStyle] = useState<HomeProductCardStyle>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", STYLE_KEY)
        .maybeSingle();
      if (!alive) return;
      setStyle(parseStyle(data?.value));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { style, loading, setStyle };
};
