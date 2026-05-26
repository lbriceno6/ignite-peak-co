import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CatalogFilterKey =
  | "price"
  | "category"
  | "subcategory"
  | "need"
  | "presentation"
  | "flavor"
  | "size"
  | "brand"
  | "supplier"
  | "availability"
  | "rating";

export type CatalogFilterConfig = Record<CatalogFilterKey, { enabled: boolean; order: number }>;

export const FILTER_META: { key: CatalogFilterKey; label: string; description: string }[] = [
  { key: "price",        label: "Precio",                  description: "Rango de precio en soles." },
  { key: "category",     label: "Categoría",               description: "Categoría principal del producto." },
  { key: "subcategory",  label: "Subcategoría",            description: "Subcategoría dependiente de la categoría." },
  { key: "need",         label: "¿Para qué lo necesitas?", description: "Necesidad de salud o bienestar." },
  { key: "presentation", label: "Presentación",            description: "Cápsulas, polvo, gotas, etc." },
  { key: "flavor",       label: "Sabor",                   description: "Sabor del producto." },
  { key: "size",         label: "Tamaño",                  description: "Tamaño o contenido." },
  { key: "brand",        label: "Marca",                   description: "Permite filtrar productos por marca." },
  { key: "supplier",     label: "Proveedor",               description: "Permite filtrar productos por proveedor." },
  { key: "availability", label: "Disponibilidad",          description: "Solo productos en stock." },
  { key: "rating",       label: "Valoración mínima",       description: "Filtra por número de estrellas." },
];

export const RECOMMENDED_CONFIG: CatalogFilterConfig = {
  price:        { enabled: true,  order: 1 },
  category:     { enabled: true,  order: 2 },
  subcategory:  { enabled: true,  order: 3 },
  need:         { enabled: true,  order: 4 },
  presentation: { enabled: true,  order: 5 },
  flavor:       { enabled: true,  order: 6 },
  availability: { enabled: true,  order: 7 },
  size:         { enabled: false, order: 8 },
  brand:        { enabled: false, order: 9 },
  supplier:     { enabled: false, order: 10 },
  rating:       { enabled: false, order: 11 },
};

export const normalizeConfig = (raw: any): CatalogFilterConfig => {
  const out = { ...RECOMMENDED_CONFIG };
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(out) as CatalogFilterKey[]) {
      const v = raw[k];
      if (v && typeof v === "object") {
        out[k] = {
          enabled: typeof v.enabled === "boolean" ? v.enabled : out[k].enabled,
          order: typeof v.order === "number" ? v.order : out[k].order,
        };
      }
    }
  }
  return out;
};

export const useCatalogFilterSettings = () => {
  const [config, setConfig] = useState<CatalogFilterConfig>(RECOMMENDED_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalog_filter_settings" as any)
        .select("config")
        .eq("id", 1)
        .maybeSingle();
      setConfig(normalizeConfig((data as any)?.config));
      setLoading(false);
    })();
  }, []);

  return { config, loading };
};
