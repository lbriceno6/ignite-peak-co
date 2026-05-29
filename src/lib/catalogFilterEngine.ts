import type { CatalogFilter } from "@/hooks/useCatalogFilters";

export type SelectedFilters = Record<string, string[] | [number, number] | boolean | number | null>;

export type DynamicOption = { value: string; label: string; count: number };

const productPrice = (p: any) => {
  const sale = Number(p.sale_price ?? 0) || 0;
  const price = Number(p.price ?? 0) || 0;
  return sale > 0 && sale < price ? sale : price;
};

const getProductValues = (p: any, filter: CatalogFilter): string[] => {
  switch (filter.filter_type) {
    case "category":    return p.category ? [String(p.category)] : [];
    case "subcategory": return p.subcategory ? [String(p.subcategory)] : [];
    case "brand":       return p.brand ? [String(p.brand)] : [];
    case "need":
    case "goal":        return Array.isArray(p.goal) ? p.goal.map(String) : (p.goal ? [String(p.goal)] : []);
    case "ingredient":  return Array.isArray(p.ingredients) ? p.ingredients.map(String) : [];
    case "benefit":     return Array.isArray(p.benefits) ? p.benefits.map(String) : [];
    case "tag":         return Array.isArray(p.tags) ? p.tags.map(String) : [];
    default:            return [];
  }
};

export const applyCatalogFilters = (
  products: any[],
  selected: SelectedFilters,
  filters: CatalogFilter[],
): any[] => {
  return products.filter((p) => {
    for (const f of filters) {
      const sel = selected[f.slug];
      if (sel == null) continue;
      switch (f.filter_type) {
        case "price": {
          const [min, max] = sel as [number, number];
          const v = productPrice(p);
          if (v < min || v > max) return false;
          break;
        }
        case "stock":
          if (sel && !(Number(p.stock ?? 0) > 0)) return false;
          break;
        case "promotion":
          if (sel) {
            const sale = Number(p.sale_price ?? 0) || 0;
            const price = Number(p.price ?? 0) || 0;
            if (!(sale > 0 && sale < price)) return false;
          }
          break;
        case "featured":
          if (sel && !p.is_featured) return false;
          break;
        case "new":
          if (sel && !p.is_new) return false;
          break;
        case "combo":
          if (sel && !p.is_combo) return false;
          break;
        case "rating":
          if (Number(sel) > 0 && Number(p.rating ?? 0) < Number(sel)) return false;
          break;
        default: {
          const arr = sel as string[];
          if (Array.isArray(arr) && arr.length) {
            const vals = getProductValues(p, f);
            if (!vals.some((v) => arr.includes(v))) return false;
          }
        }
      }
    }
    return true;
  });
};

export const computeOptions = (products: any[], filter: CatalogFilter): DynamicOption[] => {
  if (filter.options && filter.options.length > 0) {
    return filter.options.map((o) => {
      const val = o.value || o.slug;
      const count = products.filter((p) => getProductValues(p, filter).includes(val)).length;
      return { value: val, label: o.name, count };
    });
  }
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const v of getProductValues(p, filter)) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const computePriceRange = (products: any[]): [number, number] => {
  if (!products.length) return [0, 500];
  let min = Infinity, max = 0;
  for (const p of products) {
    const v = productPrice(p);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) min = 0;
  return [Math.floor(min), Math.ceil(max) || 500];
};

export const countActive = (selected: SelectedFilters, filters: CatalogFilter[]): number => {
  let n = 0;
  for (const f of filters) {
    const sel = selected[f.slug];
    if (sel == null) continue;
    if (f.filter_type === "price") {
      // price is always set; doesn't count as active by itself
      continue;
    }
    if (Array.isArray(sel) && sel.length) n++;
    else if (typeof sel === "boolean" && sel) n++;
    else if (typeof sel === "number" && sel > 0) n++;
  }
  return n;
};
