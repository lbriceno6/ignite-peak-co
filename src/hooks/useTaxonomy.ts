import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaxonomyCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  type: string;
  sort_order: number;
  is_active: boolean;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

export function useTaxonomy(opts: { activeOnly?: boolean } = {}) {
  const [items, setItems] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("type", "product")
      .order("sort_order")
      .order("name");
    setItems((data as TaxonomyCategory[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (opts.activeOnly ? items.filter((i) => i.is_active) : items),
    [items, opts.activeOnly],
  );

  const mains = useMemo(
    () => filtered.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [filtered],
  );

  const subsByParentName = useMemo(() => {
    const map: Record<string, TaxonomyCategory[]> = {};
    for (const m of mains) {
      map[m.name] = filtered
        .filter((c) => c.parent_id === m.id)
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [filtered, mains]);

  const getSubsByMainName = (name?: string | null) =>
    (name && subsByParentName[name]) || [];

  return { items, mains, subsByParentName, getSubsByMainName, loading, reload: load };
}
