import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarouselSource = "recent" | "best_sellers" | "popular" | "sale" | "top_rated" | "manual";

export type ProductsCarouselConfig = {
  id: string;
  is_active: boolean;
  title: string;
  subtitle: string | null;
  source: CarouselSource;
  total_items: number;
  visible_desktop: number;
  visible_tablet: number;
  visible_mobile: number;
  autoplay: boolean;
  autoplay_speed: number;
  show_arrows: boolean;
  show_dots: boolean;
  show_view_all: boolean;
  view_all_label: string;
  view_all_href: string;
  manual_slugs: string[];
};

export function useProductsCarouselConfig() {
  const [config, setConfig] = useState<ProductsCarouselConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("products_carousel_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setConfig({
        ...(data as any),
        manual_slugs: Array.isArray((data as any).manual_slugs) ? (data as any).manual_slugs : [],
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("products-carousel-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "products_carousel_config" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { config, loading, reload: load };
}
