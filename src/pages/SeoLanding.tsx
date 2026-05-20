import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

type Kind = "objetivo" | "ingrediente" | "beneficio";

const KIND_TO_FIELD: Record<Kind, string> = {
  objetivo: "goal",
  ingrediente: "main_ingredient",
  beneficio: "category",
};

export default function SeoLanding({ kind }: { kind: Kind }) {
  const { slug } = useParams<{ slug: string }>();
  const [landing, setLanding] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: page } = await supabase
        .from("seo_landing_pages" as any)
        .select("*")
        .eq("kind", kind)
        .eq("slug", slug)
        .maybeSingle();

      // Filter products: prefer landing.filter_field/value, else infer from slug
      const field = (page as any)?.filter_field ?? KIND_TO_FIELD[kind];
      const value = (page as any)?.filter_value ?? slug.replace(/-/g, " ");
      const { data: prods } = await supabase
        .from("products")
        .select("id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, gallery_images, size_variants, stock, badge")
        .eq("is_active", true).eq("approval_status", "approved")
        .ilike(field as any, `%${value}%`)
        .limit(60);

      if (!alive) return;
      setLanding(page);
      setProducts(prods ?? []);
      setNotFound(!page && (prods ?? []).length === 0);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [kind, slug]);

  const title = useMemo(() => {
    if (landing?.title) return landing.title;
    const pretty = (slug ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (kind === "objetivo") return `Suplementos para ${pretty}`;
    if (kind === "ingrediente") return `Productos con ${pretty}`;
    return `${pretty} — Beneficios y productos`;
  }, [landing, slug, kind]);

  if (notFound) return <Navigate to="/productos" replace />;

  const description = landing?.intro ?? `Descubre los mejores productos seleccionados para ${slug?.replace(/-/g, " ")}. Calidad garantizada, envío rápido.`;

  return (
    <Layout>
      <SEO
        title={title}
        description={description}
        path={`/${kind}/${slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
        }}
      />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> /{" "}
            <span className="text-foreground">{kind}</span> /{" "}
            <span className="text-foreground">{slug}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="container-x py-10">
        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
            Sin productos para esta selección por ahora.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        )}

        {landing?.long_description && (
          <article className="prose prose-neutral dark:prose-invert mt-12 max-w-3xl">
            <h2>Más sobre {title}</h2>
            <div className="whitespace-pre-line">{landing.long_description}</div>
          </article>
        )}
      </div>
    </Layout>
  );
}
