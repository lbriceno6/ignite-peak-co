import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { categories, goals, type Product } from "@/data/catalog";
import { useCurrency } from "@/context/CurrencyContext";
import { PaginationBar } from "@/components/PaginationBar";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";

type FilterState = {
  type: string[];
  goal: string[];
  flavor: string[];
  size: string[];
  price: [number, number];
};

const emptyFilters: FilterState = {
  type: [], goal: [], flavor: [], size: [], price: [0, 100],
};

const filterGroups: { key: keyof Omit<FilterState, "price">; title: string; options: string[] }[] = [
  { key: "type", title: "Tipo de producto", options: ["Protein", "Creatine", "Pre-Workout", "Vitamins", "Snacks", "Accessories", "Amino Acids"] },
  { key: "goal", title: "Objetivo", options: goals.map((g) => g.name) },
  { key: "flavor", title: "Sabor", options: ["Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Tropical Storm", "Lemon Ice", "Berry Blast"] },
  { key: "size", title: "Tamaño", options: ["300g", "500g", "750g", "900g", "1kg", "2kg", "4kg"] },
];

const goalNameToSlug = (name: string) => goals.find((g) => g.name === name)?.slug ?? "";

const FiltersPanel = ({
  filters, setFilters,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}) => {
  const { format, symbol } = useCurrency();
  const toggle = (key: keyof Omit<FilterState, "price">, value: string) => {
    setFilters((f) => {
      const current = f[key];
      return {
        ...f,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Precio ({symbol})</h4>
        <Slider
          value={filters.price}
          min={0} max={100} step={1}
          onValueChange={(v) => setFilters((f) => ({ ...f, price: [v[0], v[1]] as [number, number] }))}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{format(filters.price[0])}</span><span>{format(filters.price[1])}</span>
        </div>
      </div>
      <Accordion type="multiple" defaultValue={["type", "goal"]}>
        {filterGroups.map((g) => (
          <AccordionItem key={g.key} value={g.key}>
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">{g.title}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {g.options.map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters[g.key].includes(o)}
                      onCheckedChange={() => toggle(g.key, o)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

const rowToProduct = (r: any): Product => {
  const hasSale = r.sale_price != null && Number(r.sale_price) > 0 && Number(r.sale_price) < Number(r.price);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortBenefit: r.short_description ?? "",
    price: Number(hasSale ? r.sale_price : r.price),
    oldPrice: hasSale ? Number(r.price) : undefined,
    rating: 4.7,
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: r.goal ? [r.goal] : [],
    flavors: r.flavor ? [r.flavor] : undefined,
    sizes: r.size ? [r.size] : undefined,
    brand: "VOLTRA",
    subscriptionEnabled: r.subscription_enabled,
    subscriptionDiscountPercent: r.subscription_discount_percent ? Number(r.subscription_discount_percent) : undefined,
    subscriptionIntervals: r.subscription_intervals ?? undefined,
    supplier: r.supplier ? {
      slug: r.supplier.slug,
      business_name: r.supplier.business_name,
      logo_url: r.supplier.logo_url,
    } : null,
  };
};

const Category = () => {
  const { slug = "" } = useParams();
  const [sort, setSort] = useState("popular");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (slug.startsWith("goal-")) {
      const g = goals.find((x) => x.slug === slug.replace("goal-", ""));
      return g?.name ?? "Objetivo";
    }
    const c = categories.find((x) => x.slug === slug);
    return c?.name ?? "Todos los productos";
  }, [slug]);

  // Reset page when slug/filters/sort/pageSize change
  useEffect(() => { setPage(1); }, [slug, filters, sort, pageSize]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("products")
        .select("*, supplier:suppliers(id, business_name, slug, logo_url)", { count: "exact" });

      // Route-level scope
      if (slug.startsWith("goal-")) {
        query = query.eq("goal", slug.replace("goal-", ""));
      } else {
        const c = categories.find((x) => x.slug === slug);
        if (c) {
          const word = c.name.split(" ")[0];
          query = query.ilike("category", `%${word}%`);
        }
      }

      // Facet filters (all applied server-side so the count is exact)
      if (filters.type.length) query = query.in("category", filters.type);
      if (filters.goal.length) query = query.in("goal", filters.goal.map(goalNameToSlug));
      if (filters.flavor.length) query = query.in("flavor", filters.flavor);
      if (filters.size.length) query = query.in("size", filters.size);
      query = query.gte("price", filters.price[0]).lte("price", filters.price[1]);

      // Sort
      if (sort === "price-low") query = query.order("price", { ascending: true });
      else if (sort === "price-high") query = query.order("price", { ascending: false });
      else query = query.order("sort_order", { ascending: true } as any).order("created_at", { ascending: false });

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (!error) {
        setItems((data ?? []).map(rowToProduct));
        setTotal(count ?? 0);
      }
      setLoading(false);
    };
    run();
  }, [slug, filters, sort, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const activeChips = useMemo(() => {
    const chips: { key: keyof Omit<FilterState, "price">; value: string }[] = [];
    (Object.keys(filters) as (keyof FilterState)[]).forEach((k) => {
      if (k === "price") return;
      filters[k].forEach((v) => chips.push({ key: k, value: v }));
    });
    return chips;
  }, [filters]);

  const removeChip = (key: keyof Omit<FilterState, "price">, value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].filter((v) => v !== value) }));

  const clearAll = () => setFilters(emptyFilters);

  return (
    <Layout>
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">{title}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{total} productos</p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl uppercase">Filtros</h3>
            {activeChips.length > 0 && (
              <button onClick={clearAll} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
                Limpiar
              </button>
            )}
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} />
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal size={16} /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-6"><FiltersPanel filters={filters} setFilters={setFilters} /></div>
              </SheetContent>
            </Sheet>

            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-md border border-border bg-background py-2 pl-3 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="popular">Más populares</option>
                  <option value="price-low">Precio: menor a mayor</option>
                  <option value="price-high">Precio: mayor a menor</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeChips.map((c) => (
                <Badge key={`${c.key}-${c.value}`} variant="secondary" className="gap-1">
                  {c.value}
                  <button onClick={() => removeChip(c.key, c.value)} className="ml-1">
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {!loading && total === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-muted-foreground">Ningún producto coincide con tus filtros.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>Limpiar filtros</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <PaginationBar
                page={currentPage}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Category;
