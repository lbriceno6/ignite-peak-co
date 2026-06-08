import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_BG, DEFAULT_LAYOUT, type CarouselBackgroundCfg, type CarouselDesign, type CarouselLayoutCfg } from "@/lib/homeCarouselDesign";

export function useHomeCarouselGlobal() {
  const [design, setDesign] = useState<CarouselDesign>({ layout: DEFAULT_LAYOUT, background: DEFAULT_BG });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("home_carousel_global" as any)
      .select("layout, background")
      .eq("id", "default")
      .maybeSingle();
    if (data) {
      setDesign({
        layout: { ...DEFAULT_LAYOUT, ...((data as any).layout || {}) } as CarouselLayoutCfg,
        background: { ...DEFAULT_BG, ...((data as any).background || {}) } as CarouselBackgroundCfg,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("home-carousel-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_carousel_global" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const save = useCallback(async (next: CarouselDesign) => {
    const { error } = await supabase
      .from("home_carousel_global" as any)
      .upsert({ id: "default", layout: next.layout as any, background: next.background as any, updated_at: new Date().toISOString() } as any);
    if (!error) setDesign(next);
    return error;
  }, []);

  return { design, loading, reload: load, save };
}
