import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PageKey =
  | "catalog" | "category" | "subcategory" | "brand" | "search"
  | "need" | "promotions" | "combos" | "featured" | "new" | "related";

export type FilterType =
  | "price" | "category" | "subcategory" | "brand" | "ingredient"
  | "benefit" | "need" | "goal" | "tag" | "stock" | "promotion"
  | "flag" | "combo" | "featured" | "new" | "rating";

export type CatalogFilterOption = {
  id: string;
  filter_id: string;
  name: string;
  slug: string;
  value: string | null;
  color: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

export type CatalogFilter = {
  id: string;
  name: string;
  slug: string;
  filter_type: FilterType;
  is_active: boolean;
  display_order: number;
  selection_type: "single" | "multi";
  show_desktop: boolean;
  show_mobile: boolean;
  default_open: boolean;
  pages_visibility: PageKey[];
  ui_widget: "checkbox" | "range" | "chips" | "toggle";
  options: CatalogFilterOption[];
};

const sb = supabase as any;

export const useCatalogFilters = (page: PageKey, opts?: { adminMode?: boolean }) => {
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: defs }, { data: opts2 }] = await Promise.all([
        sb.from("catalog_filters").select("*").order("display_order"),
        sb.from("catalog_filter_options").select("*").order("display_order"),
      ]);
      if (!alive) return;
      const byFilter: Record<string, CatalogFilterOption[]> = {};
      ((opts2 ?? []) as CatalogFilterOption[]).forEach((o) => {
        (byFilter[o.filter_id] ??= []).push(o);
      });
      const merged: CatalogFilter[] = ((defs ?? []) as any[])
        .filter((d) =>
          opts?.adminMode
            ? true
            : d.is_active && Array.isArray(d.pages_visibility) && d.pages_visibility.includes(page),
        )
        .map((d) => ({
          ...d,
          pages_visibility: Array.isArray(d.pages_visibility) ? d.pages_visibility : [],
          options: (byFilter[d.id] ?? []).filter((o) => opts?.adminMode || o.is_active),
        }));
      setFilters(merged);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [page, opts?.adminMode]);

  return { filters, loading };
};

export const FILTER_TYPE_META: { key: FilterType; label: string; widget: CatalogFilter["ui_widget"]; hasOptions: boolean }[] = [
  { key: "price",        label: "Precio",          widget: "range",    hasOptions: false },
  { key: "category",     label: "Categoría",       widget: "checkbox", hasOptions: false },
  { key: "subcategory",  label: "Subcategoría",    widget: "checkbox", hasOptions: false },
  { key: "brand",        label: "Marca",           widget: "checkbox", hasOptions: false },
  { key: "need",         label: "Necesidad",       widget: "checkbox", hasOptions: false },
  { key: "goal",         label: "Objetivo",        widget: "checkbox", hasOptions: true  },
  { key: "ingredient",   label: "Ingrediente",     widget: "checkbox", hasOptions: true  },
  { key: "benefit",      label: "Beneficio",       widget: "checkbox", hasOptions: true  },
  { key: "tag",          label: "Etiqueta",        widget: "checkbox", hasOptions: true  },
  { key: "stock",        label: "Disponibilidad",  widget: "toggle",   hasOptions: false },
  { key: "promotion",    label: "Promociones",     widget: "toggle",   hasOptions: false },
  { key: "featured",     label: "Destacados",      widget: "toggle",   hasOptions: false },
  { key: "new",          label: "Nuevos",          widget: "toggle",   hasOptions: false },
  { key: "combo",        label: "Combos",          widget: "toggle",   hasOptions: false },
  { key: "flag",         label: "Bandera",         widget: "toggle",   hasOptions: false },
  { key: "rating",       label: "Valoración",      widget: "chips",    hasOptions: false },
];

export const ALL_PAGES: { key: PageKey; label: string }[] = [
  { key: "catalog",     label: "Tienda / catálogo" },
  { key: "category",    label: "Categoría" },
  { key: "subcategory", label: "Subcategoría" },
  { key: "brand",       label: "Marca" },
  { key: "search",      label: "Búsqueda" },
  { key: "need",        label: "Necesidad" },
  { key: "promotions",  label: "Promociones" },
  { key: "combos",      label: "Combos" },
  { key: "featured",    label: "Destacados" },
  { key: "new",         label: "Nuevos" },
  { key: "related",     label: "Relacionados" },
];
