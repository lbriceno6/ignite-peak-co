import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Search as SearchIcon, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SEO } from "@/components/SEO";
import { usePromotions } from "@/hooks/usePromotions";
import { isPromoActiveNow, promoSubtitle, promoTitle } from "@/lib/promotions";
import { resolveProductImage } from "@/lib/productImage";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/data/catalog";

const PRODUCT_COLS =
  "id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, badge, stock";

const rowToProduct = (r: any): Product => {
  const price = Number(r.price ?? 0) || 0;
  const sale = Number(r.sale_price ?? 0) || 0;
  const hasSale = sale > 0 && sale < price;

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? sale : price,
    oldPrice: hasSale ? price : undefined,
    rating: Number(r.rating ?? 0),
    reviews: Number(r.reviews_count ?? r.reviews ?? 0),
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: [],
    brand: r.brand ?? "Nutribatidos",
  };
};

type Filters = {
  q: string;
  categories: string[];
  brands: string[];
  price: [number, number];
  inStock: boolean;
};

const PromotionParticipants = () => {
  const { promotions, loading: promotionsLoading } = usePromotions();
  const { format, symbol } = useCurrency();
  const [products, setProducts] = useState<(Product & { stock?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("popular");

  const activePromos = useMemo(
    () => promotions.filter((p) => isPromoActiveNow(p) && p.product_ids.length > 0),
    [promotions],
  );
  const productIds = useMemo(
    () => Array.from(new Set(activePromos.flatMap((p) => p.product_ids))),
    [activePromos],
  );
  const mainPromo = activePromos[0];

  useEffect(() => {
    if (promotionsLoading) return;
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    supabase
      .from("products")
      .select(PRODUCT_COLS)
      .in("id", productIds)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .gt("price", 0)
      .then(({ data }) => {
        if (!alive) return;
        const order = new Map(productIds.map((id, index) => [id, index]));
        setProducts(
          ((data ?? []) as any[])
            .map((r) => ({ ...rowToProduct(r), stock: Number(r.stock ?? 0) }))
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
        );
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [productIds, promotionsLoading]);

  // Facet options
  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );
  const brandOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort() as string[],
    [products],
  );
  const maxPrice = useMemo(
    () => Math.max(100, ...products.map((p) => Math.ceil(p.price))),
    [products],
  );

  const [filters, setFilters] = useState<Filters>({
    q: "",
    categories: [],
    brands: [],
    price: [0, 100],
    inStock: false,
  });

  // Sync price max when products load
  useEffect(() => {
    setFilters((f) => ({ ...f, price: [0, maxPrice] }));
  }, [maxPrice]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filters.q && !p.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
      if (filters.categories.length && !filters.categories.includes(p.category)) return false;
      if (filters.brands.length && !filters.brands.includes(p.brand!)) return false;
      if (p.price < filters.price[0] || p.price > filters.price[1]) return false;
      if (filters.inStock && (p.stock ?? 0) <= 0) return false;
      return true;
    });
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "rating": list = [...list].sort((a, b) => b.rating - a.rating); break;
      case "name": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [products, filters, sort]);

  const toggleArr = (key: "categories" | "brands", value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const clearFilters = () =>
    setFilters({ q: "", categories: [], brands: [], price: [0, maxPrice], inStock: false });

  const activeCount =
    (filters.q ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    (filters.inStock ? 1 : 0) +
    (filters.price[0] !== 0 || filters.price[1] !== maxPrice ? 1 : 0);

  const FiltersPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Buscar</label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Nombre del producto"
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Precio ({symbol})</h4>
        <Slider
          value={filters.price}
          min={0}
          max={maxPrice}
          step={1}
          onValueChange={(v) => setFilters((f) => ({ ...f, price: [v[0], v[1]] as [number, number] }))}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{format(filters.price[0])}</span>
          <span>{format(filters.price[1])}</span>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["cat", "brand", "stock"]}>
        {categoryOptions.length > 0 && (
          <AccordionItem value="cat">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Categoría</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {categoryOptions.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.categories.includes(c)}
                      onCheckedChange={() => toggleArr("categories", c)}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {brandOptions.length > 0 && (
          <AccordionItem value="brand">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Marca</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {brandOptions.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.brands.includes(b)}
                      onCheckedChange={() => toggleArr("brands", b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

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
      </Accordion>

      {activeCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
          <X size={14} className="mr-1.5" /> Limpiar filtros ({activeCount})
        </Button>
      )}
    </div>
  );

  const title = mainPromo ? promoTitle(mainPromo) : "Productos participantes";
  const subtitle = mainPromo
    ? promoSubtitle(mainPromo)
    : "Productos disponibles en promociones activas.";

  return (
    <Layout>
      <SEO title={`${title} | Nutribatidos`} description={subtitle} path="/promociones/compra-uno-lleva-otro" />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">Promociones</span>
          </nav>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles size={16} /> Promoción activa
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="container-x py-10">
        {loading || promotionsLoading ? (
          <p className="text-sm text-muted-foreground">Cargando productos participantes…</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-lg font-medium">No hay productos participantes disponibles.</p>
            <p className="mt-2 text-sm text-muted-foreground">Revisa el catálogo para encontrar otros productos activos.</p>
            <Button asChild variant="accent" className="mt-5">
              <Link to="/productos">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <FiltersPanel />
            </aside>

            <div>
              {/* Toolbar */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden">
                        Filtros {activeCount > 0 && `(${activeCount})`}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Filtros</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <FiltersPanel />
                      </div>
                    </SheetContent>
                  </Sheet>
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} de {products.length} producto{products.length === 1 ? "" : "s"}
                  </p>
                </div>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Más relevantes</SelectItem>
                    <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                    <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                    <SelectItem value="rating">Mejor valorados</SelectItem>
                    <SelectItem value="name">Nombre (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                  <p className="text-base font-medium">Ningún producto coincide con los filtros.</p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                    Limpiar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PromotionParticipants;
