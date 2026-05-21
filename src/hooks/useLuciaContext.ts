import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { detectLandingKind, type LuciaContext } from "@/lib/lucia";

export function useLuciaContext(): LuciaContext {
  const { pathname } = useLocation();
  const params = useParams();
  const [ctx, setCtx] = useState<LuciaContext>({ page: pathname });

  useEffect(() => {
    let alive = true;
    (async () => {
      const base: LuciaContext = { page: pathname };

      // Product page
      const productMatch = pathname.match(/^\/(producto|product|productos)\/([^/]+)/);
      if (productMatch) {
        const slug = productMatch[2];
        const { data } = await supabase
          .from("products")
          .select("id,name,slug")
          .eq("slug", slug)
          .maybeSingle();
        if (alive) {
          setCtx({
            page: pathname,
            productSlug: slug,
            productName: data?.name ?? null,
            productId: data?.id ?? null,
          });
        }
        return;
      }

      // Category page
      const catMatch = pathname.match(/^\/(categoria|category|categorias)\/([^/]+)/);
      if (catMatch) {
        setCtx({ page: pathname, category: catMatch[2] });
        return;
      }

      // Landing pages
      const kind = detectLandingKind(pathname);
      if (kind && params.slug) {
        const { data } = await supabase
          .from("seo_landing_pages" as any)
          .select("filter_field,filter_value")
          .eq("kind", kind)
          .eq("slug", params.slug)
          .maybeSingle();
        if (alive) {
          setCtx({
            page: pathname,
            landing: {
              kind,
              field: (data as any)?.filter_field ?? null,
              value: (data as any)?.filter_value ?? params.slug,
            },
          });
        }
        return;
      }

      if (alive) setCtx(base);
    })();
    return () => {
      alive = false;
    };
  }, [pathname, params.slug]);

  return ctx;
}
