import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SeoEntityType = "product" | "category" | "blog" | "page";

export type SeoMetaRow = {
  id?: string;
  entity_type: SeoEntityType;
  entity_id: string;
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  og_image: string | null;
  canonical: string | null;
  schema_jsonld: Record<string, unknown> | Record<string, unknown>[] | null;
  shopping_title: string | null;
  shopping_description: string | null;
  short_description: string | null;
  long_description: string | null;
  noindex: boolean;
  robots_directive: string | null;
  score: number | null;
  last_analyzed_at: string | null;
};

export const useSeoMeta = (entityType: SeoEntityType | null, entityId: string | null | undefined) => {
  const [data, setData] = useState<SeoMetaRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityType || !entityId) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from("seo_meta" as any)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (!alive) return;
      setData((row as unknown as SeoMetaRow) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [entityType, entityId]);

  return { data, loading };
};

export const useSeoImageAlts = (entityType: SeoEntityType | null, entityId: string | null | undefined) => {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!entityType || !entityId) { setMap({}); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("seo_image_alts" as any)
        .select("image_url, alt_text")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (!alive) return;
      const m: Record<string, string> = {};
      ((data as any[]) ?? []).forEach((r) => { m[r.image_url] = r.alt_text; });
      setMap(m);
    })();
    return () => { alive = false; };
  }, [entityType, entityId]);

  return map;
};
