import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { logSearch } from "@/lib/searchLog";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import { CatalogFiltersPanel } from "@/components/catalog/CatalogFiltersPanel";
import { applyCatalogFilters, type SelectedFilters } from "@/lib/catalogFilterEngine";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";

const PRODUCT_COLS = "id, slug, name, short_description, price, sale_price, main_image, category, subcategory, rating, brand, gallery_images, size_variants, stock, badge, ingredients, goal";

const rowToProduct = (r: any): Product => {
  const priceN = Number(r.price ?? 0) || 0;
  const saleN = Number(r.sale_price ?? 0) || 0;
  const hasSale = saleN > 0 && saleN < priceN;
  return {
    id: r.id, slug: r.slug, name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? saleN : priceN,
    oldPrice: hasSale ? priceN : undefined,
    rating: Number(r.rating ?? 0),
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    // @ts-expect-error optional
    subcategory: r.subcategory ?? "",
    goal: [],
    brand: r.brand ?? "",
  };
};

const Search = () => {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const needSlug = (params.get("necesidad") ?? "").trim();
  const catSlug = (params.get("categoria") ?? "").trim();

  const [rawResults, setRawResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [need, setNeed] = useState<any | null>(null);
  const [waNumber, setWaNumber] = useState<string>("14155552671");
  const [helperWa, setHelperWa] = useState<boolean>(true);
  const [selected, setSelected] = useState<SelectedFilters>({});
  const { user } = useAuth();
  const { filters: catalogFilters } = useCatalogFilters("search");

  useEffect(() => {
    (async () => {
      const [needRes, chatRes, settingsRes] = await Promise.all([
        needSlug
          ? (supabase.from as any)("search_needs").select("*").eq("slug", needSlug).maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase.from as any)("chat_ai_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
        (supabase.from as any)("search_ai_settings").select("fallback_whatsapp_enabled").eq("id", 1).maybeSingle(),
      ]);
      if (needRes?.data) setNeed(needRes.data);
      if (chatRes?.data?.whatsapp_number) setWaNumber(chatRes.data.whatsapp_number);
      if (typeof settingsRes?.data?.fallback_whatsapp_enabled === "boolean") setHelperWa(settingsRes.data.fallback_whatsapp_enabled);
    })();
  }, [needSlug]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      let rows: any[] = [];
      const productIds: string[] = need?.related_products ?? [];
      if (productIds.length) {
        const { data } = await supabase.from("products").select(PRODUCT_COLS)
          .in("id", productIds).eq("is_active", true).eq("approval_status", "approved");
        rows = data ?? [];
      }
      if (!rows.length && catSlug) {
        const { data: cat } = await supabase.from("categories").select("id,name").eq("slug", catSlug).maybeSingle();
        if (cat) {
          const { data } = await supabase.from("products").select(PRODUCT_COLS)
            .eq("category", cat.name).eq("is_active", true).eq("approval_status", "approved").limit(60);
          rows = data ?? [];
        }
      }
      if (!rows.length && q) {
        const { data, error } = await supabase.rpc("search_products" as any, { q });
        if (error) {
          const { data: fb } = await supabase.from("products").select(PRODUCT_COLS)
            .eq("is_active", true).eq("approval_status", "approved")
            .ilike("name", `%${q}%`).limit(40);
          rows = fb ?? [];
        } else {
          const ranked = (data as any[]) ?? [];
          const ids = ranked.map((r) => r.id);
          if (ids.length) {
            const { data: full } = await supabase.from("products").select(PRODUCT_COLS).in("id", ids);
            const order = new Map(ids.map((id, i) => [id, i]));
            rows = (full ?? []).slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
          }
          const best = ranked[0];
          if (best && best.score < 0.4 && best.name) setDidYouMean(best.name); else setDidYouMean(null);
        }
      }
      if (!alive) return;
      setRawResults(rows);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [q, needSlug, catSlug, need?.id]);

  const results = useMemo(
    () => applyCatalogFilters(rawResults, selected, catalogFilters).map(rowToProduct),
    [rawResults, selected, catalogFilters],
  );

  useEffect(() => {
    if (loading) return;
    if (q) {
      logSearch({ query: q, resultsCount: rawResults.length, userId: user?.id });
      track("search", { search_term: q, results: rawResults.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const title = useMemo(() => {
    if (need?.name) return `Productos recomendados para ${need.name}`;
    if (catSlug) return `Productos en ${catSlug.replace(/-/g, " ")}`;
    if (q) return `Resultados para "${q}"`;
    return "Búsqueda";
  }, [need, catSlug, q]);

  const waUrl = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hola, vi en Nutribatidos algo sobre "${q || need?.name || "una necesidad"}" y me gustaría asesoría.`,
  )}`;

  return (
    <Layout>
      <SEO title={title} description={need?.message ?? `Resultados para "${q}"`} path={`/buscar?q=${encodeURIComponent(q)}`} />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">Búsqueda</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          {need?.message && (
            <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground">
              <Sparkles size={16} className="text-accent" /> {need.message}
            </p>
          )}
          {!need && (
            <p className="mt-2 text-muted-foreground">
              {loading ? "Buscando…" : `${results.length} productos encontrados`}
            </p>
          )}
          {didYouMean && !loading && (
            <p className="mt-1 text-sm text-muted-foreground">¿Quisiste decir <span className="font-medium text-foreground">{didYouMean}</span>?</p>
          )}
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <CatalogFiltersPanel
          page="search"
          products={rawResults}
          selected={selected}
          onChange={setSelected}
          className="hidden lg:block"
        />

        <div>
          <CatalogFiltersPanel
            page="search"
            products={rawResults}
            selected={selected}
            onChange={setSelected}
            className="mb-4 lg:hidden"
          />

          {!loading && results.length === 0 ? (
            <div className="rounded-lg border border-border p-10 text-center">
              <p className="text-lg font-medium">No encontramos productos con estos filtros.</p>
              <p className="mt-2 text-sm text-muted-foreground">Prueba quitar algunos filtros o consulta con nosotros.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setSelected({})}>Limpiar filtros</Button>
                {helperWa && (
                  <Button asChild variant="dark">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={16} className="mr-1.5" /> Hablar con Lucía
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => <ProductCard key={p.id} product={p as any} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Search;
