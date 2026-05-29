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
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Sparkles, SlidersHorizontal } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/data/catalog";

const PRODUCT_COLS = "id, slug, name, short_description, price, sale_price, main_image, category, subcategory, rating, brand, gallery_images, size_variants, stock, badge";

const rowToProduct = (r: any): Product => {
  const priceN = Number(r.price ?? 0) || 0;
  const saleN = Number(r.sale_price ?? 0) || 0;
  const hasSale = saleN > 0 && saleN < priceN;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? saleN : priceN,
    oldPrice: hasSale ? priceN : undefined,
    rating: Number(r.rating ?? 0),
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    // @ts-expect-error optional subcategory
    subcategory: r.subcategory ?? "",
    goal: [],
    brand: r.brand ?? "",
  };
};

type Filters = {
  brand: string[];
  price: [number, number];
  inStock: boolean;
  rating: number;
};

const emptyFilters: Filters = { brand: [], price: [0, 500], inStock: false, rating: 0 };

const FiltersPanel = ({
  filters, setFilters, brands,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  brands: string[];
}) => {
  const { format, symbol } = useCurrency();
  const toggleBrand = (b: string) =>
    setFilters((f) => ({
      ...f,
      brand: f.brand.includes(b) ? f.brand.filter((x) => x !== b) : [...f.brand, b],
    }));
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Precio ({symbol})</h4>
        <Slider
          value={filters.price}
          min={0} max={500} step={5}
          onValueChange={(v) => setFilters((f) => ({ ...f, price: [v[0], v[1]] as [number, number] }))}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{format(filters.price[0])}</span><span>{format(filters.price[1])}</span>
        </div>
      </div>
      <Accordion type="multiple" defaultValue={["brand", "stock", "rating"]}>
        <AccordionItem value="brand">
          <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Marca</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2.5">
              {brands.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">Sin opciones</p>
              ) : brands.map((b) => (
                <label key={b} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={filters.brand.includes(b)} onCheckedChange={() => toggleBrand(b)} />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="stock">
          <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Disponibilidad</AccordionTrigger>
          <AccordionContent>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={filters.inStock}
                onCheckedChange={(v) => setFilters((f) => ({ ...f, inStock: !!v }))}
              />
              <span>Solo productos en stock</span>
            </label>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="rating">
          <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Valoración mínima</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2.5">
              {[4, 3, 2, 1].map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={filters.rating === r}
                    onCheckedChange={(v) => setFilters((f) => ({ ...f, rating: v ? r : 0 }))}
                  />
                  <span>★ {r}+</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
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
  const [brands, setBrands] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const [needRes, chatRes, settingsRes, brandsRes] = await Promise.all([
        needSlug
          ? (supabase.from as any)("search_needs").select("*").eq("slug", needSlug).maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase.from as any)("chat_ai_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
        (supabase.from as any)("search_ai_settings").select("fallback_whatsapp_enabled").eq("id", 1).maybeSingle(),
        (supabase.from as any)("brands").select("name").eq("is_active", true).order("name"),
      ]);
      if (needRes?.data) setNeed(needRes.data);
      if (chatRes?.data?.whatsapp_number) setWaNumber(chatRes.data.whatsapp_number);
      if (typeof settingsRes?.data?.fallback_whatsapp_enabled === "boolean") setHelperWa(settingsRes.data.fallback_whatsapp_enabled);
      setBrands(((brandsRes?.data ?? []) as any[]).map((b) => b.name).filter(Boolean));
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

  const results = useMemo(() => {
    return rawResults.filter((r) => {
      const priceN = Number(r.sale_price && r.sale_price > 0 ? r.sale_price : r.price) || 0;
      if (priceN < filters.price[0] || priceN > filters.price[1]) return false;
      if (filters.brand.length && !filters.brand.includes(r.brand)) return false;
      if (filters.inStock && !(Number(r.stock ?? 0) > 0)) return false;
      if (filters.rating > 0 && Number(r.rating ?? 0) < filters.rating) return false;
      return true;
    }).map(rowToProduct);
  }, [rawResults, filters]);

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

  const clearAll = () => setFilters(emptyFilters);
  const activeCount =
    filters.brand.length +
    (filters.inStock ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.price[0] > 0 || filters.price[1] < 500 ? 1 : 0);

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
          {(need?.related_category || catSlug) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="dark">
                <Link to={`/categoria/${need?.related_category || catSlug}`}>Ver categoría completa</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={14} className="mr-1.5" /> Consultar por WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl uppercase">Filtros</h3>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
                Limpiar
              </button>
            )}
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} brands={brands} />
        </aside>

        <div>
          <div className="mb-4 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal size={16} /> Filtrar
                  {activeCount > 0 && <Badge className="ml-1 bg-accent text-accent-foreground">{activeCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-4"><FiltersPanel filters={filters} setFilters={setFilters} brands={brands} /></div>
              </SheetContent>
            </Sheet>
          </div>

          {!loading && results.length === 0 ? (
            <div className="rounded-lg border border-border p-10 text-center">
              <p className="text-lg font-medium">No encontramos un producto exacto.</p>
              <p className="mt-2 text-sm text-muted-foreground">Pero podemos ayudarte a elegir uno según tu necesidad.</p>
              {helperWa && (
                <Button asChild className="mt-4" variant="dark">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} className="mr-1.5" /> Hablar con Lucía por WhatsApp
                  </a>
                </Button>
              )}
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
