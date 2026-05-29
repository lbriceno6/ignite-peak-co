import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CatalogFiltersPanel } from "@/components/catalog/CatalogFiltersPanel";
import { applyCatalogFilters, type SelectedFilters } from "@/lib/catalogFilterEngine";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";

const sb = supabase as any;

type Brand = {
  id: string; name: string; slug: string;
  logo_url: string | null; banner_url: string | null;
  short_description: string | null; long_description: string | null;
  seo_title: string | null; seo_description: string | null;
};

const rowToProduct = (r: any, brandName: string): Product => {
  const price = Number(r.price ?? 0) || 0;
  const sale = Number(r.sale_price ?? 0) || 0;
  const hasSale = sale > 0 && sale < price;
  return {
    id: r.id, slug: r.slug, name: r.name,
    shortBenefit: r.short_description ?? "",
    price: hasSale ? sale : price,
    oldPrice: hasSale ? price : undefined,
    rating: Number(r.rating ?? 0),
    reviews: 0,
    label: r.badge as Product["label"] | undefined,
    image: resolveProductImage(r.main_image),
    category: r.category ?? "",
    goal: [],
    brand: brandName,
  };
};

export default function BrandPage() {
  const { slug } = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedFilters>({});
  const { filters } = useCatalogFilters("brand");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: b } = await sb.from("brands")
        .select("id,name,slug,logo_url,banner_url,short_description,long_description,seo_title,seo_description")
        .eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!b) { setBrand(null); setLoading(false); return; }
      setBrand(b as Brand);
      const { data: p } = await sb.from("products")
        .select("id,slug,name,short_description,price,sale_price,main_image,category,subcategory,rating,brand,stock,badge,is_featured,is_new")
        .eq("brand_id", b.id).eq("is_active", true).eq("approval_status", "approved")
        .order("stock", { ascending: false }).order("rating", { ascending: false });
      setProducts(p ?? []);
      setLoading(false);
    })();
  }, [slug]);

  const filtered = useMemo(
    () => applyCatalogFilters(products, selected, filters),
    [products, selected, filters],
  );

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10">
          <Skeleton className="h-40 w-full" />
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!brand) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl">Marca no encontrada</h1>
          <p className="mt-2 text-muted-foreground">La marca que buscas no existe o no está disponible.</p>
          <Button asChild className="mt-6" variant="dark"><Link to="/">Volver al inicio</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={brand.seo_title || `${brand.name} | Nutribatidos`}
        description={brand.seo_description || brand.short_description || `Productos de la marca ${brand.name}`}
      />
      <div className="container mx-auto px-4 py-8">
        {brand.banner_url && (
          <div className="mb-6 overflow-hidden rounded-xl">
            <img src={brand.banner_url} alt={`Banner ${brand.name}`} className="h-48 w-full object-cover md:h-64" />
          </div>
        )}

        <header className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center">
          {brand.logo_url && (
            <img src={brand.logo_url} alt={`Logo ${brand.name}`}
              className="h-20 w-20 rounded-lg border bg-background object-contain p-2" />
          )}
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Marca</p>
            <h1 className="font-display text-3xl md:text-4xl">{brand.name}</h1>
            {brand.short_description && (
              <p className="mt-1 text-muted-foreground">{brand.short_description}</p>
            )}
          </div>
        </header>

        {brand.long_description && (
          <div className="prose prose-sm mb-8 max-w-none text-muted-foreground">
            <p>{brand.long_description}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <CatalogFiltersPanel
            page="brand"
            products={products}
            selected={selected}
            onChange={setSelected}
            className="hidden lg:block"
          />
          <section>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {filtered.length} producto{filtered.length === 1 ? "" : "s"}
              </p>
              <CatalogFiltersPanel
                page="brand"
                products={products}
                selected={selected}
                onChange={setSelected}
                className="lg:hidden"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                <p>No encontramos productos con estos filtros.</p>
                <Button variant="outline" className="mt-4" onClick={() => setSelected({})}>Limpiar filtros</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={rowToProduct(p, brand.name)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
