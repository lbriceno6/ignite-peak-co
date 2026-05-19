import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import { Loader2, Globe, MapPin } from "lucide-react";

type Supplier = {
  id: string; slug: string; business_name: string; commercial_name: string | null;
  description: string | null; logo_url: string | null; website: string | null;
  city: string | null; country: string | null;
};

const toCard = (p: any, sup: Supplier): Product => ({
  id: p.id, slug: p.slug, name: p.name,
  shortBenefit: p.short_description ?? "",
  price: Number(p.sale_price ?? p.price),
  oldPrice: p.sale_price ? Number(p.price) : undefined,
  rating: 4.8, reviews: 0,
  label: p.badge?.toLowerCase() === "best-seller" || p.badge?.toLowerCase() === "best seller" ? "Best Seller"
    : p.badge?.toLowerCase() === "new" ? "New"
    : (p.badge?.toLowerCase() === "sale" || p.badge?.toLowerCase() === "offer") ? "Offer" : undefined,
  image: resolveProductImage(p.main_image),
  category: p.category ?? "", goal: [], brand: sup.business_name,
  supplier: { slug: sup.slug, business_name: sup.business_name, logo_url: sup.logo_url },
});

export default function SupplierStorefront() {
  const { slug } = useParams();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: sup } = await supabase.from("suppliers")
        .select("id,slug,business_name,commercial_name,description,logo_url,website,city,country,status")
        .eq("slug", slug).maybeSingle();
      if (!sup || (sup as any).status !== "approved") {
        setNotFound(true); setLoading(false); return;
      }
      setSupplier(sup as Supplier);
      const { data: prods } = await supabase.from("products")
        .select("id,slug,name,short_description,price,sale_price,category,main_image,badge")
        .eq("supplier_id", (sup as any).id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      setProducts(((prods as any[]) ?? []).map((p) => toCard(p, sup as Supplier)));
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <Layout><div className="grid h-[50vh] place-items-center"><Loader2 className="animate-spin"/></div></Layout>;
  }
  if (notFound || !supplier) {
    return (
      <Layout>
        <div className="container-x py-24 text-center">
          <h1 className="font-display text-3xl uppercase">Proveedor no encontrado</h1>
          <p className="mt-2 text-muted-foreground">Esta tienda no existe o aún no está aprobada.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="bg-gradient-to-b from-secondary/50 to-background">
        <div className="container-x flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center">
          {supplier.logo_url
            ? <img src={supplier.logo_url} alt={supplier.business_name} className="h-24 w-24 shrink-0 rounded-lg border bg-background object-cover shadow-sm"/>
            : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border bg-muted font-display text-4xl text-muted-foreground">
                {supplier.business_name.charAt(0)}
              </div>}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Vendido por</p>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">{supplier.business_name}</h1>
            {supplier.description && <p className="mt-2 max-w-2xl text-muted-foreground">{supplier.description}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {(supplier.city || supplier.country) && (
                <span className="inline-flex items-center gap-1"><MapPin size={14}/> {[supplier.city, supplier.country].filter(Boolean).join(", ")}</span>
              )}
              {supplier.website && (
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Globe size={14}/> Sitio web
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase">Catálogo</h2>
          <span className="text-sm text-muted-foreground">{products.length} producto{products.length !== 1 ? "s" : ""}</span>
        </div>
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            Este proveedor aún no tiene productos publicados.
            <div className="mt-3"><Link to="/" className="font-semibold underline">Volver al inicio</Link></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p}/>)}
          </div>
        )}
      </section>
    </Layout>
  );
}
