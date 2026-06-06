import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, X, Search, Truck, ShieldCheck, Leaf, MessageCircle } from "lucide-react";
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
import { logBrowseEvent } from "@/lib/recoEvents";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import { mainCategories, getSubcategories, mainBySlug, subBySlug } from "@/lib/productCategories";
import { useCatalogFilterSettings, type CatalogFilterConfig, type CatalogFilterKey } from "@/hooks/useCatalogFilterSettings";
import { SEO } from "@/components/SEO";
import { getCategoryAncestors, type CategoryNode } from "@/lib/categoryTree";

const WA_CONSULT =
  "https://wa.me/51999999999?text=" +
  encodeURIComponent("¡Hola Nutribatidos! Necesito ayuda para encontrar un producto.");

const HEALTH_NEEDS = [
  "Energía y Vitalidad",
  "Control de Peso",
  "Digestión y Colon",
  "Próstata y Salud Masculina",
  "Hígado y Limpieza Natural",
  "Articulaciones y Huesos",
  "Defensas e Inmunidad",
  "Corazón y Circulación",
  "Riñones y Vías Urinarias",
  "Piel, Cabello y Uñas",
  "Bienestar General",
];

type FilterState = {
  mainCategory: string;
  subcategory: string;
  type: string[];
  goal: string[];
  flavor: string[];
  size: string[];
  brand: string[];
  supplier: string[];
  rating: number;
  price: [number, number];
  inStock: boolean;
};

const emptyFilters: FilterState = {
  mainCategory: "", subcategory: "",
  type: [], goal: [], flavor: [], size: [], brand: [], supplier: [],
  rating: 0, price: [0, 100], inStock: false,
};

type DynamicGroup = { key: "type" | "goal" | "flavor" | "size"; title: string; options: { label: string; value: string }[] };

const GROUP_TITLES: Record<"type" | "goal" | "flavor" | "size", string> = {
  type: "Presentación",
  goal: "¿Para qué lo necesitas?",
  flavor: "Sabor",
  size: "Tamaño",
};



const FiltersPanel = ({
  filters, setFilters, dynamicGroups, config, brands, suppliers,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  dynamicGroups: DynamicGroup[];
  config: CatalogFilterConfig;
  brands: string[];
  suppliers: { id: string; name: string }[];
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

  const subOptions = useMemo(() => getSubcategories(filters.mainCategory), [filters.mainCategory]);

  const healthGoal = dynamicGroups.find((g) => g.key === "goal");
  const healthOptions = (healthGoal && healthGoal.options.length > 0)
    ? healthGoal.options.map((o) => o.label)
    : HEALTH_NEEDS;

  const grp = (k: "type" | "flavor" | "size") => dynamicGroups.find((g) => g.key === k);

  // Enabled keys sorted by configured order
  const orderedKeys = (Object.keys(config) as CatalogFilterKey[])
    .filter((k) => config[k].enabled)
    .sort((a, b) => config[a].order - config[b].order);

  const renderBlock = (key: CatalogFilterKey) => {
    switch (key) {
      case "price":
        return (
          <div key="price">
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
        );
      case "category":
        return (
          <AccordionItem key="cat" value="cat">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Categoría</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {mainCategories.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.mainCategory === c}
                      onCheckedChange={(v) =>
                        setFilters((f) => ({ ...f, mainCategory: v ? c : "", subcategory: "" }))
                      }
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      case "subcategory":
        if (!filters.mainCategory || subOptions.length === 0) return null;
        return (
          <AccordionItem key="subcat" value="subcat">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Subcategoría</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {subOptions.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.subcategory === s}
                      onCheckedChange={(v) => setFilters((f) => ({ ...f, subcategory: v ? s : "" }))}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      case "need":
        return (
          <AccordionItem key="need" value="need">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">¿Para qué lo necesitas?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {healthOptions.map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={filters.goal.includes(o)} onCheckedChange={() => toggle("goal", o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      case "presentation":
      case "flavor":
      case "size": {
        const k = key === "presentation" ? "type" : key;
        const g = grp(k as "type" | "flavor" | "size");
        const title = key === "presentation" ? "Presentación" : key === "flavor" ? "Sabor" : "Tamaño";
        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">{title}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {!g || g.options.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">Sin opciones</p>
                ) : g.options.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters[g.key].includes(o.label)}
                      onCheckedChange={() => toggle(g.key, o.label)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      }
      case "brand":
        return (
          <AccordionItem key="brand" value="brand">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Marca</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {brands.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">Sin opciones</p>
                ) : brands.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={filters.brand.includes(b)} onCheckedChange={() => toggle("brand", b)} />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      case "supplier":
        return (
          <AccordionItem key="supplier" value="supplier">
            <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">Proveedor</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2.5">
                {suppliers.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">Sin opciones</p>
                ) : suppliers.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={filters.supplier.includes(s.id)} onCheckedChange={() => toggle("supplier", s.id)} />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      case "availability":
        return (
          <AccordionItem key="stock" value="stock">
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
        );
      case "rating":
        return (
          <AccordionItem key="rating" value="rating">
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
        );
      default:
        return null;
    }
  };

  const priceBlock = orderedKeys.includes("price") ? renderBlock("price") : null;
  const accordionKeys = orderedKeys.filter((k) => k !== "price");

  return (
    <div className="space-y-4">
      {priceBlock}
      <Accordion type="multiple" defaultValue={accordionKeys as string[]}>
        {accordionKeys.map((k) => renderBlock(k))}
      </Accordion>
    </div>
  );
};

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
    reviews: Number(r.reviews_count ?? r.reviews ?? 0),
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    // @ts-expect-error subcategory no está en el type pero ProductCard lo lee opcional.
    subcategory: r.subcategory ?? "",
    goal: r.goal ? [r.goal] : [],
    flavors: r.flavor ? [r.flavor] : undefined,
    sizes: r.size ? [r.size] : undefined,
    brand: r.brand ?? "",
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
  const params = useParams();
  const slug = params.slug ?? params.catSlug ?? "";
  const subSlugParam = params.subSlug ?? "";
  const taxonomyMain = mainBySlug[slug];
  const taxonomySub = taxonomyMain && subSlugParam ? subBySlug[slug]?.[subSlugParam] : undefined;
  const [sort, setSort] = useState("popular");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dynamicGroups, setDynamicGroups] = useState<DynamicGroup[]>([
    { key: "type", title: GROUP_TITLES.type, options: [] },
    { key: "goal", title: GROUP_TITLES.goal, options: [] },
    { key: "flavor", title: GROUP_TITLES.flavor, options: [] },
    { key: "size", title: GROUP_TITLES.size, options: [] },
  ]);
  const { config: filterConfig } = useCatalogFilterSettings();
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliersList, setSuppliersList] = useState<{ id: string; name: string }[]>([]);
  const [ancestors, setAncestors] = useState<CategoryNode[]>([]);
  const [children, setChildren] = useState<CategoryNode[]>([]);

  useEffect(() => {
    if (!slug) return;
    void logBrowseEvent("browse_category_view", {
      category_slug: slug,
      metadata: { sub: subSlugParam || null },
    });
  }, [slug, subSlugParam]);

  useEffect(() => {
    let alive = true;
    getCategoryAncestors(slug).then(async (chain) => {
      if (!alive) return;
      setAncestors(chain);
      const leaf = chain[chain.length - 1];
      if (leaf) {
        const { getCategoryChildren } = await import("@/lib/categoryTree");
        const kids = await getCategoryChildren(leaf.id);
        if (alive) setChildren(kids);
      } else {
        setChildren([]);
      }
    });
    return () => { alive = false; };
  }, [slug]);

  // Load brand/supplier facets only when those filters are enabled
  useEffect(() => {
    if (filterConfig.brand.enabled) {
      // Cargar SOLO marcas reales activas desde la tabla brands (no usar el campo libre products.brand)
      (supabase.from as any)("brands")
        .select("name")
        .eq("is_active", true)
        .order("name")
        .then(({ data }: any) => {
          setBrands(((data ?? []) as any[]).map((b) => b.name).filter(Boolean));
        });
    }
    if (filterConfig.supplier.enabled) {
      (supabase.from("suppliers_public" as any).select("id, business_name") as any).then(({ data }: any) => {
        setSuppliersList(((data as any) ?? []).map((s: any) => ({ id: s.id, name: s.business_name })));
      });
    }
  }, [filterConfig.brand.enabled, filterConfig.supplier.enabled]);

  const title = useMemo(() => {
    if (taxonomySub) return taxonomySub;
    if (taxonomyMain) return taxonomyMain;
    if (slug.startsWith("goal-")) {
      const g = goals.find((x) => x.slug === slug.replace("goal-", ""));
      return g?.name ?? "Objetivo";
    }
    const c = categories.find((x) => x.slug === slug);
    return c?.name ?? "Todos los productos";
  }, [slug, taxonomyMain, taxonomySub]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when scope, filters, sort, pageSize or search change
  useEffect(() => { setPage(1); }, [slug, subSlugParam, filters, sort, pageSize, debouncedQ]);

  // Load admin-managed filter options
  useEffect(() => {
    const loadOpts = async () => {
      const { data } = await supabase
        .from("filter_options" as any)
        .select("group,label,value,sort_order,is_enabled")
        .eq("is_enabled", true)
        .order("sort_order");
      const rows = ((data as any) ?? []) as { group: string; label: string; value: string }[];
      const byGroup = (k: string) =>
        rows.filter((r) => r.group === k).map((r) => ({ label: r.label, value: r.value }));
      setDynamicGroups([
        { key: "type", title: GROUP_TITLES.type, options: byGroup("type") },
        { key: "goal", title: GROUP_TITLES.goal, options: byGroup("goal") },
        { key: "flavor", title: GROUP_TITLES.flavor, options: byGroup("flavor") },
        { key: "size", title: GROUP_TITLES.size, options: byGroup("size") },
      ]);
    };
    loadOpts();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("products")
        .select("*, supplier:suppliers_public(id, business_name, slug, logo_url)" as any, { count: "exact" }) as any;

      // Route-level scope
      if (taxonomyMain) {
        query = query.eq("category", taxonomyMain);
        if (taxonomySub) query = query.eq("subcategory", taxonomySub);
      } else if (slug.startsWith("goal-")) {
        const goalSlug = slug.replace("goal-", "");
        // Buscar por slug del goal card y también por el nombre visible (compatibilidad
        // con productos antiguos que guardaban el texto en español: "Desarrollar músculo").
        let goalNames: string[] = [];
        try {
          const { data: gc } = await (supabase.from("goal_cards" as any) as any)
            .select("name,slug")
            .eq("slug", goalSlug)
            .maybeSingle();
          if (gc?.name) goalNames.push(gc.name);
        } catch { /* noop */ }
        const candidates = Array.from(new Set([goalSlug, ...goalNames])).filter(Boolean);
        query = query.in("goal", candidates);
      } else {
        const c = categories.find((x) => x.slug === slug);
        if (c) {
          const word = c.name.split(" ")[0];
          query = query.ilike("category", `%${word}%`);
        } else if (slug) {
          // DB-backed category slug from mega menu: match by category name (best effort)
          // Look up by direct slug-to-name isn't available client-side, so try ilike on the raw slug words.
          const word = slug.replace(/-/g, " ");
          query = query.ilike("category", `%${word}%`);
        }
      }

      // Search (name, descripciones, ingredientes, categoría, sub, marca, objetivo)
      if (debouncedQ) {
        const safe = debouncedQ.replace(/[%,()]/g, " ");
        query = query.or(
          [
            `name.ilike.%${safe}%`,
            `short_description.ilike.%${safe}%`,
            `long_description.ilike.%${safe}%`,
            `ingredients.ilike.%${safe}%`,
            `main_ingredient.ilike.%${safe}%`,
            `category.ilike.%${safe}%`,
            `subcategory.ilike.%${safe}%`,
            `brand.ilike.%${safe}%`,
            `goal.ilike.%${safe}%`,
          ].join(","),
        );
      }

      // Facet filters (server-side para que el conteo sea exacto)
      if (filters.mainCategory) query = query.eq("category", filters.mainCategory);
      if (filters.subcategory) query = query.eq("subcategory", filters.subcategory);
      if (filters.type.length) query = query.in("category", filters.type);
      if (filters.goal.length) query = query.in("goal", filters.goal);
      if (filters.flavor.length) query = query.in("flavor", filters.flavor);
      if (filters.size.length) query = query.in("size", filters.size);
      if (filters.brand.length) query = query.in("brand", filters.brand);
      if (filters.supplier.length) query = query.in("supplier_id", filters.supplier);
      if (filters.rating > 0) query = query.gte("rating", filters.rating);
      if (filters.inStock) query = query.gt("stock", 0);
      query = query.gte("price", filters.price[0]).lte("price", filters.price[1]);
      // No mostrar productos con precio 0 en el catálogo público (regla de negocio).
      query = query.gt("price", 0);

      // Sort
      if (sort === "price-low") query = query.order("price", { ascending: true });
      else if (sort === "price-high") query = query.order("price", { ascending: false });
      else if (sort === "rating") query = query.order("rating", { ascending: false });
      else if (sort === "new") query = query.order("created_at", { ascending: false });
      else if (sort === "offers") query = query.not("sale_price", "is", null).order("sale_price", { ascending: true });
      else if (sort === "bestsellers") query = query.order("rating", { ascending: false });
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
  }, [slug, subSlugParam, filters, sort, page, pageSize, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rangeFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo = Math.min(currentPage * pageSize, total);

  const activeChips = useMemo(() => {
    const chips: { key: keyof FilterState; value: string; label: string }[] = [];
    if (filters.mainCategory) chips.push({ key: "mainCategory", value: filters.mainCategory, label: filters.mainCategory });
    if (filters.subcategory) chips.push({ key: "subcategory", value: filters.subcategory, label: filters.subcategory });
    filters.type.forEach((v) => chips.push({ key: "type", value: v, label: v }));
    filters.goal.forEach((v) => chips.push({ key: "goal", value: v, label: v }));
    filters.flavor.forEach((v) => chips.push({ key: "flavor", value: v, label: v }));
    filters.size.forEach((v) => chips.push({ key: "size", value: v, label: v }));
    if (filters.rating > 0) chips.push({ key: "rating", value: String(filters.rating), label: `★ ${filters.rating}+` });
    if (filters.inStock) chips.push({ key: "inStock", value: "1", label: "En stock" });
    if (filters.price[0] > 0 || filters.price[1] < 100) {
      chips.push({ key: "price", value: "range", label: `S/ ${filters.price[0]} – S/ ${filters.price[1]}` });
    }
    return chips;
  }, [filters]);

  const removeChip = (key: keyof FilterState, value: string) => {
    setFilters((f) => {
      if (key === "rating") return { ...f, rating: 0 };
      if (key === "inStock") return { ...f, inStock: false };
      if (key === "price") return { ...f, price: [0, 100] };
      if (key === "mainCategory") return { ...f, mainCategory: "", subcategory: "" };
      if (key === "subcategory") return { ...f, subcategory: "" };
      const arr = f[key] as string[];
      return { ...f, [key]: arr.filter((v) => v !== value) };
    });
  };

  const clearAll = () => { setFilters(emptyFilters); setQ(""); };

  const trustItems = [
    { Icon: Truck, text: "Envíos a todo el Perú" },
    { Icon: ShieldCheck, text: "Pago seguro" },
    { Icon: Leaf, text: "Productos naturales seleccionados" },
    { Icon: MessageCircle, text: "Atención por WhatsApp" },
  ];

  const leafCat = ancestors[ancestors.length - 1];
  const SITE_URL = "https://ignite-peak-co.lovable.app";
  const seoTitle = leafCat?.meta_title || `${title} | Nutribatidos`;
  const seoDesc = leafCat?.meta_description || leafCat?.short_description || `Compra ${title} en Nutribatidos. Suplementos naturales seleccionados, envíos a todo el Perú.`;
  const canonicalPath = leafCat ? `/categoria/${leafCat.slug}` : `/categoria/${slug}`;
  const canonical = leafCat?.canonical_url || `${SITE_URL}${canonicalPath}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Productos", item: `${SITE_URL}/productos` },
      ...ancestors.map((a, i) => ({
        "@type": "ListItem",
        position: 3 + i,
        name: a.name,
        item: `${SITE_URL}/categoria/${a.slug}`,
      })),
    ],
  };

  return (
    <Layout>
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={canonical}
        image={leafCat?.image_url ?? undefined}
        jsonLd={breadcrumbJsonLd}
      />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-accent">Inicio</Link>
            {" / "}
            <Link to="/productos" className="hover:text-accent">Productos</Link>
            {ancestors.slice(0, -1).map((a) => (
              <span key={a.id}>{" / "}<Link to={`/categoria/${a.slug}`} className="hover:text-accent">{a.name}</Link></span>
            ))}
            {" / "}<span className="text-foreground">{leafCat?.name || title}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{leafCat?.name || title}</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Cargando…" : `Mostrando ${rangeFrom}–${rangeTo} de ${total} productos`}
          </p>
        </div>
      </div>

      {/* Franja de confianza, discreta */}
      <div className="border-y border-border bg-background">
        <div className="container-x grid grid-cols-2 gap-3 py-3 text-xs text-muted-foreground sm:grid-cols-4">
          {trustItems.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={14} className="text-accent" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {children.length > 0 && (
        <div className="container-x pt-8">
          <h2 className="mb-4 font-display text-xl uppercase">Subcategorías</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {children.map((c) => (
              <Link
                key={c.id}
                to={`/categoria/${c.slug}`}
                className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-center transition-smooth hover:border-accent hover:shadow-md"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="aspect-square w-full rounded object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded bg-accent/10" />
                )}
                <span className="text-sm font-medium text-foreground group-hover:text-accent">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}


      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl uppercase">Filtros</h3>
            {(activeChips.length > 0 || q) && (
              <button onClick={clearAll} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
                Limpiar todo
              </button>
            )}
          </div>
          <FiltersPanel filters={filters} setFilters={setFilters} dynamicGroups={dynamicGroups} config={filterConfig} brands={brands} suppliers={suppliersList} />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal size={16} /> Filtrar productos
                  {activeChips.length > 0 && (
                    <Badge className="ml-1 bg-accent text-accent-foreground">{activeChips.length}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{total} productos</span>
                  <button onClick={clearAll} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
                    Limpiar todo
                  </button>
                </div>
                <div className="mt-4"><FiltersPanel filters={filters} setFilters={setFilters} dynamicGroups={dynamicGroups} config={filterConfig} brands={brands} suppliers={suppliersList} /></div>
              </SheetContent>
            </Sheet>

            <div className="relative min-w-[220px] flex-1 sm:max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca por producto, ingrediente o necesidad"
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
                  <option value="price-low">Menor precio</option>
                  <option value="price-high">Mayor precio</option>
                  <option value="new">Nuevos productos</option>
                  <option value="offers">Ofertas</option>
                  <option value="bestsellers">Más vendidos</option>
                  <option value="rating">Mejor valorados</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Filtros activos:</span>
              {activeChips.map((c) => (
                <Badge key={`${c.key}-${c.value}`} variant="secondary" className="gap-1">
                  {c.label}
                  <button onClick={() => removeChip(c.key, c.value)} aria-label={`Quitar ${c.label}`} className="ml-1">
                    <X size={12} />
                  </button>
                </Badge>
              ))}
              <button
                onClick={clearAll}
                className="text-xs uppercase tracking-wider text-muted-foreground underline-offset-2 hover:text-accent hover:underline"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {!loading && total === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 px-4 text-center">
              <p className="text-lg font-medium">No encontramos productos con estos filtros.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prueba ajustando tus filtros o consúltanos por WhatsApp y te recomendamos un producto.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={clearAll}>Limpiar filtros</Button>
                <Button variant="secondary" asChild>
                  <Link to="/categoria/todos">Ver todos los productos</Link>
                </Button>
                <Button variant="accent" asChild>
                  <a href={WA_CONSULT} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={14} /> Consultar por WhatsApp
                  </a>
                </Button>
              </div>
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
