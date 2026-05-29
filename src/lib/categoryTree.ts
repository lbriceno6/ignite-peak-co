import { supabase } from "@/integrations/supabase/client";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  image_url: string | null;
  description: string | null;
  short_description?: string | null;
  long_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  show_in_sitemap?: boolean;
  show_in_home?: boolean;
};

let cache: { all: CategoryNode[]; at: number } | null = null;
const TTL = 60_000;

export const loadAllCategories = async (): Promise<CategoryNode[]> => {
  if (cache && Date.now() - cache.at < TTL) return cache.all;
  const { data } = await (supabase as any)
    .from("categories")
    .select("id,name,slug,parent_id,is_active,image_url,description,short_description,long_description,meta_title,meta_description,canonical_url,show_in_sitemap,show_in_home")
    .eq("type", "product");
  const all = ((data as CategoryNode[]) ?? []);
  cache = { all, at: Date.now() };
  return all;
};

export const invalidateCategoryCache = () => { cache = null; };

export const getCategoryBySlug = async (slug: string): Promise<CategoryNode | null> => {
  const all = await loadAllCategories();
  return all.find((c) => c.slug === slug) ?? null;
};

/** Build ancestor chain from root → category (inclusive). */
export const getCategoryAncestors = async (slug: string): Promise<CategoryNode[]> => {
  const all = await loadAllCategories();
  const byId = new Map(all.map((c) => [c.id, c]));
  const start = all.find((c) => c.slug === slug);
  if (!start) return [];
  const chain: CategoryNode[] = [start];
  let cur: CategoryNode | undefined = start;
  while (cur?.parent_id) {
    const p = byId.get(cur.parent_id);
    if (!p) break;
    chain.unshift(p);
    cur = p;
  }
  return chain;
};

export const getCategoryChildren = async (id: string): Promise<CategoryNode[]> => {
  const all = await loadAllCategories();
  return all.filter((c) => c.parent_id === id && c.is_active);
};
