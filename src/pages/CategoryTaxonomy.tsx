import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import {
  categoryData,
  mainBySlug,
  subBySlug,
  slugifyCategory,
} from "@/lib/productCategories";
import type { Product } from "@/data/catalog";
import { CatalogFiltersPanel, applyCatalogFilters } from "@/components/catalog/CatalogFiltersPanel";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import type { SelectedFilters } from "@/lib/catalogFilterEngine";
import { DynamicPricingBanner } from "@/components/pricing/DynamicPricingBanner";

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
    reviews: Number(r.reviews_count ?? 0),
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    // @ts-expect-error subcategory opcional usado por ProductCard.
    subcategory: r.subcategory ?? "",
    goal: r.goal ? [r.goal] : [],
    flavors: r.flavor ? [r.flavor] : undefined,
    sizes: r.size ? [r.size] : undefined,
    brand: r.brand ?? "Nutribatidos",
    supplier: null,
  };
};

export default function CategoryTaxonomy() {
  const params = useParams();
  const catSlug = params.catSlug ?? params.slug ?? "";
  const subSlug = params.subSlug;
  const mainName = mainBySlug[catSlug];
  const subName = subSlug ? subBySlug[catSlug]?.[subSlug] : undefined;

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedFilters>({});
  const { filters: catalogFilters } = useCatalogFilters("category");

  const subcategories = useMemo(
    () => (mainName ? categoryData[mainName] : []),
    [mainName],
  );

  useEffect(() => {
    if (!mainName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category", mainName)
        .order("sort_order", { ascending: true } as any)
        .order("created_at", { ascending: false })
        .limit(60);
      if (subName) q = q.eq("subcategory", subName);
      const { data } = await q;
      if (!cancelled) {
        setItems((data ?? []).map(rowToProduct));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mainName, subName]);

  if (!mainName) {
    return (
      <Layout>
        <div className="container-x py-20 text-center">
          <h1 className="font-display text-3xl">Categoría no encontrada</h1>
          <Link to="/" className="mt-4 inline-block text-accent hover:underline">Volver al inicio</Link>
        </div>
      </Layout>
    );
  }

  const title = subName ? `${subName} · ${mainName}` : mainName;
  const description = subName
    ? `Descubre nuestra selección de ${subName.toLowerCase()} dentro de ${mainName.toLowerCase()} en Nutribatidos.`
    : `Explora la colección ${mainName.toLowerCase()} de Nutribatidos: superalimentos andinos y bienestar natural.`;

  return (
    <Layout>
      <SEO title={`${title} | Nutribatidos`} description={description} />

      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link>
            {" / "}
            <Link to={`/categoria/${catSlug}`} className="hover:text-accent">{mainName}</Link>
            {subName && (
              <>
                {" / "}
                <span className="text-foreground">{subName}</span>
              </>
            )}
          </nav>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Subcategorías como filtros / cards */}
      {subcategories.length > 0 && (
        <div className="border-b bg-background">
          <div className="container-x flex flex-wrap gap-2 py-4">
            <Link
              to={`/categoria/${catSlug}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                !subName ? "border-accent bg-accent text-accent-foreground" : "hover:border-accent"
              }`}
            >
              Todo en {mainName}
            </Link>
            {subcategories.map((s) => {
              const sSlug = slugifyCategory(s);
              const active = sSlug === subSlug;
              return (
                <Link
                  key={s}
                  to={`/categoria/${catSlug}/${sSlug}`}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    active ? "border-accent bg-accent text-accent-foreground" : "hover:border-accent"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="container-x py-10">
        {loading ? (
          <p className="text-muted-foreground">Cargando productos…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-secondary/30 p-12 text-center">
            <p className="text-muted-foreground">
              No hay productos disponibles en esta {subName ? "subcategoría" : "categoría"}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
