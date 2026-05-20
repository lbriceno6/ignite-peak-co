import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const Search = () => {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("search_products" as any, { q });
      if (!alive) return;
      if (error) {
        // Fallback simple
        const { data: fb } = await supabase
          .from("products")
          .select("id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, gallery_images, size_variants, stock, badge")
          .eq("is_active", true).eq("approval_status", "approved")
          .ilike("name", `%${q}%`).limit(40);
        setResults(fb ?? []);
      } else {
        const rows = (data as any[]) ?? [];
        // Fetch full product cards
        const ids = rows.map((r) => r.id);
        if (ids.length) {
          const { data: full } = await supabase
            .from("products")
            .select("id, slug, name, short_description, price, sale_price, main_image, category, rating, brand, gallery_images, size_variants, stock, badge")
            .in("id", ids);
          const order = new Map(ids.map((id, i) => [id, i]));
          const sorted = (full ?? []).slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
          setResults(sorted);
        } else {
          setResults([]);
        }
        // "Did you mean" — show top match if best score < 0.4 and exists
        const best = rows[0];
        if (best && best.score < 0.4 && best.name) setDidYouMean(best.name); else setDidYouMean(null);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [q]);

  return (
    <Layout>
      <SEO title={q ? `Buscar: ${q}` : "Buscar productos"} description={`Resultados de búsqueda para "${q}"`} path={`/buscar?q=${encodeURIComponent(q)}`} />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">Búsqueda</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">
            {q ? <>Resultados para "{q}"</> : "Búsqueda"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Buscando…" : `${results.length} productos encontrados`}
          </p>
          {didYouMean && !loading && (
            <p className="mt-1 text-sm text-muted-foreground">¿Quisiste decir <span className="font-medium text-foreground">{didYouMean}</span>?</p>
          )}
        </div>
      </div>

      <div className="container-x py-10">
        {q && !loading && results.length === 0 ? (
          <div className="rounded-lg border border-border p-10 text-center">
            <p className="text-lg font-medium">Ningún producto coincide con tu búsqueda.</p>
            <p className="mt-2 text-sm text-muted-foreground">Prueba con otra palabra como "proteína", "creatina" o "vitamina".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
