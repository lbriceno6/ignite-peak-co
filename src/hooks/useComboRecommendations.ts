import { useEffect, useState } from "react";
import {
  smartComboRecommendation,
  type ComboRecommendation,
  type RecommendationContext,
} from "@/lib/smartCombos";

export function useComboRecommendations(ctx: RecommendationContext, deps: any[] = []) {
  const [recs, setRecs] = useState<ComboRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    smartComboRecommendation(ctx)
      .then((r) => {
        if (active) setRecs(r);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { recs, loading };
}
