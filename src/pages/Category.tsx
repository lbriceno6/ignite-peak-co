import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, X, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
  brand: string[];
  supplier: string[]; // supplier ids
  rating: number; // minimum rating: 0..5
  price: [number, number];
};

const emptyFilters: FilterState = {
  type: [], goal: [], flavor: [], size: [], brand: [], supplier: [], rating: 0, price: [0, 100],
};

const staticFilterGroups: { key: "type" | "goal" | "flavor" | "size"; title: string; options: string[] }[] = [
  { key: "type", title: "Tipo de producto", options: ["Protein", "Creatine", "Pre-Workout", "Vitamins", "Snacks", "Accessories", "Amino Acids"] },
  { key: "goal", title: "Objetivo", options: goals.map((g) => g.name) },
  { key: "flavor", title: "Sabor", options: ["Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Tropical Storm", "Lemon Ice", "Berry Blast"] },
  { key: "size", title: "Tamaño", options: ["300g", "500g", "750g", "900g", "1kg", "2kg", "4kg"] },
];

const goalNameToSlug = (name: string) => goals.find((g) => g.name === name)?.slug ?? "";

const FiltersPanel = ({
  filters, setFilters, brands, suppliers,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  brands: string[];
  suppliers: { id: string; business_name: string }[];
}) => {
  const { format, symbol } = useCurrency();
  const toggle = (key: "type" | "goal" | "flavor" | "size" | "brand" | "supplier", value: string) => {
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

      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Valoración mínima</h4>
        <div className="flex flex-wrap gap-1.5">
          {[0, 3, 3.5, 4, 4.5].map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={filters.rating === r ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFilters((f) => ({ ...f, rating: r }))}
            >
              {r === 0 ? "Todas" : `★ ${r}+`}
            </Button>
          ))}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["type", "goal", "brand", "supplier"]}>
        {staticFilterGroups.map((g) => (
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

        {brands.length > 0 && (
          <AccordionItem value="brand">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Marca</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-56 space-y-2.5 overflow-y-auto pr-2">
                {brands.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.brand.includes(b)}
                      onCheckedChange={() => toggle("brand", b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {suppliers.length > 0 && (
          <AccordionItem value="supplier">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Proveedor</AccordionTrigger>
            <AccordionContent>
              <div className="max-h-56 space-y-2.5 overflow-y-auto pr-2">
                {suppliers.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.supplier.includes(s.id)}
                      onCheckedChange={() => toggle("supplier", s.id)}
                    />
                    <span>{s.business_name}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
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
    rating: Number(r.rating ?? 0) || 4.7,
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: r.goal ? [r.goal] : [],
    flavors: r.flavor ? [r.flavor] : undefined,
    sizes: r.size ? [r.size] : undefined,
    brand: r.brand ?? "VOLTRA",
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
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string }[]>([]);

  const title = useMemo(() => {
    if (slug.startsWith("goal-")) {
      const g = goals.find((x) => x.slug === slug.replace("goal-", ""));
      return g?.name ?? "Objetivo";
    }
    const c = categories.find((x) => x.slug === slug);
    return c?.name ?? "Todos los productos";
  }, [slug]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when scope, filters, sort, pageSize or search change
  useEffect(() => { setPage(1); }, [slug, filters, sort, pageSize, debouncedQ]);

  // Load brand + supplier facets once per scope
  useEffect(() => {
    const loadFacets = async () => {
      const [{ data: bRows }, { data: sRows }] = await Promise.all([
        supabase.from("products").select("brand").not("brand", "is", null).limit(1000),
        supabase.from("suppliers").select("id, business_name").eq("status", "approved").order("business_name"),
      ]);
      const uniq = Array.from(new Set((bRows ?? []).map((r: any) => r.brand).filter(Boolean))).sort();
      setBrands(uniq);
      setSuppliers((sRows ?? []) as any);
    };
    loadFacets();
  }, []);

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

      // Search (name OR short_description)
      if (debouncedQ) {
        const safe = debouncedQ.replace(/[%,()]/g, " ");
        query = query.or(`name.ilike.%${safe}%,short_description.ilike.%${safe}%`);
      }

      // Facet filters (all server-side so the count is exact)
      if (filters.type.length) query = query.in("category", filters.type);
      if (filters.goal.length) query = query.in("goal", filters.goal.map(goalNameToSlug));
      if (filters.flavor.length) query = query.in("flavor", filters.flavor);
      if (filters.size.length) query = query.in("size", filters.size);
      if (filters.brand.length) query = query.in("brand", filters.brand);
      if (filters.supplier.length) query = query.in("supplier_id", filters.supplier);
      if (filters.rating > 0) query = query.gte("rating", filters.rating);
      query = query.gte("price", filters.price[0]).lte("price", filters.price[1]);

      // Sort
      if (sort === "price-low") query = query.order("price", { ascending: true });
      else if (sort === "price-high") query = query.order("price", { ascending: false });
      else if (sort === "rating") query = query.order("rating", { ascending: false });
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
  }, [slug, filters, sort, page, pageSize, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rangeFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo = Math.min(currentPage * pageSize, total);

  const activeChips = useMemo(() => {
    const chips: { key: keyof FilterState; value: string; label: string }[] = [];
    filters.type.forEach((v) => chips.push({ key: "type", value: v, label: v }));
    filters.goal.forEach((v) => chips.push({ key: "goal", value: v, label: v }));
    filters.flavor.forEach((v) => chips.push({ key: "flavor", value: v, label: v }));
    filters.size.forEach((v) => chips.push({ key: "size", value: v, label: v }));
    filters.brand.forEach((v) => chips.push({ key: "brand", value: v, label: v }));
    filters.supplier.forEach((v) => {
      const s = suppliers.find((x) => x.id === v);
      chips.push({ key: "supplier", value: v, label: s?.business_name ?? "Proveedor" });
    });
    if (filters.rating > 0) chips.push({ key: "rating", value: String(filters.rating), label: `★ ${filters.rating}+` });
    return chips;
  }, [filters, suppliers]);

  const removeChip = (key: keyof FilterState, value: string) => {
    setFilters((f) => {
      if (key === "rating") return { ...f, rating: 0 };
      if (key === "price") return f;
      const arr = f[key] as string[];
      return { ...f, [key]: arr.filter((v) => v !== value) };
    });
  };

  const clearAll = () => { setFilters(emptyFilters); setQ(""); };

  return (
    <Layout>
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">{title}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando…" : `Mostrando ${rangeFrom}–${rangeTo} de ${total} productos`}
          </p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl uppercase">Filtros</h3>
            {(activeChips.length > 0 || q) && (
              <button onClick={clearAll} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
                Limpiar
              </button>
            )}
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} brands={brands} suppliers={suppliers} />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal size={16} /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-6"><FiltersPanel filters={filters} setFilters={setFilters} brands={brands} suppliers={suppliers} /></div>
              </SheetContent>
            </Sheet>

            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en esta categoría…"
                className="h-10 pl-9"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-md border border-border bg-background py-2 pl-3 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="popular">Más populares</option>
                  <option value="rating">Mejor valorados</option>
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
                  {c.label}
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
              <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 ${loading ? "opacity-60 transition-opacity" : ""}`}>
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
