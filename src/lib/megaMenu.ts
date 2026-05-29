import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export type MegaMenuColumn = {
  id: string;
  parent_nav: string;
  title: string;
  position: number;
  see_all_label: string | null;
  see_all_href: string | null;
  show_desktop: boolean;
  show_mobile: boolean;
  is_active: boolean;
};

export type MegaMenuItem = {
  id: string;
  column_id: string;
  display_label: string;
  link_type: "category" | "goal" | "page" | "url";
  category_id: string | null;
  goal_id: string | null;
  url: string | null;
  icon: string | null;
  image_url: string | null;
  open_in_new_tab: boolean;
  position: number;
  show_desktop: boolean;
  show_mobile: boolean;
  is_active: boolean;
  seo_note: string | null;
};

export type MegaMenuNavSetting = {
  parent_nav: string;
  label: string;
  href: string;
  position: number;
};

export type MegaMenuData = {
  columns: MegaMenuColumn[];
  items: MegaMenuItem[];
  categories: Record<string, { slug: string; name: string; is_active: boolean }>;
  goals: Record<string, { slug: string; name: string; is_active: boolean }>;
  redirects: Record<string, string>;
  navSettings: Record<string, MegaMenuNavSetting>;
};

export async function loadMegaMenu(): Promise<MegaMenuData> {
  const [cols, items, cats, goals, redirects] = await Promise.all([
    sb.from("mega_menu_columns").select("*").eq("is_active", true).order("position"),
    sb.from("mega_menu_items").select("*").eq("is_active", true).order("position"),
    sb.from("categories").select("id,slug,name,is_active"),
    sb.from("goals").select("id,slug,name,is_active"),
    sb.from("seo_redirects").select("from_path,to_path,active").eq("active", true),
  ]);

  const catMap: MegaMenuData["categories"] = {};
  (cats.data ?? []).forEach((c: any) => { catMap[c.id] = c; });
  const goalMap: MegaMenuData["goals"] = {};
  (goals.data ?? []).forEach((g: any) => { goalMap[g.id] = g; });
  const redirMap: Record<string, string> = {};
  (redirects.data ?? []).forEach((r: any) => { redirMap[r.from_path] = r.to_path; });

  return {
    columns: (cols.data ?? []) as MegaMenuColumn[],
    items: (items.data ?? []) as MegaMenuItem[],
    categories: catMap,
    goals: goalMap,
    redirects: redirMap,
  };
}

export function resolveItemHref(item: MegaMenuItem, data: MegaMenuData): string | null {
  let href: string | null = null;
  if (item.link_type === "category" && item.category_id) {
    const c = data.categories[item.category_id];
    if (!c || !c.is_active) return null;
    href = `/categoria/${c.slug}`;
  } else if (item.link_type === "goal" && item.goal_id) {
    const g = data.goals[item.goal_id];
    if (!g || !g.is_active) return null;
    href = `/objetivo/${g.slug}`;
  } else if (item.link_type === "page" || item.link_type === "url") {
    href = item.url || null;
  }
  if (!href) return null;
  // follow active 301
  if (data.redirects[href]) href = data.redirects[href];
  return href;
}

export function columnsByNav(data: MegaMenuData, parentNav: string): MegaMenuColumn[] {
  return data.columns
    .filter((c) => c.parent_nav === parentNav)
    .sort((a, b) => a.position - b.position);
}

export function itemsForColumn(data: MegaMenuData, columnId: string, surface: "desktop" | "mobile"): MegaMenuItem[] {
  return data.items
    .filter((i) => i.column_id === columnId && (surface === "desktop" ? i.show_desktop : i.show_mobile))
    .sort((a, b) => a.position - b.position);
}
