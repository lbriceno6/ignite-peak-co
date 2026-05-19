import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/catalog";

const Search = () => {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();

  const results = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return products.filter((p) =>
      [p.name, p.shortBenefit, p.category, p.brand, ...(p.flavors ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);

  return (
    <Layout>
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> / <span className="text-foreground">Búsqueda</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">
            {q ? <>Resultados para "{q}"</> : "Búsqueda"}
          </h1>
          <p className="mt-2 text-muted-foreground">{results.length} productos encontrados</p>
        </div>
      </div>

      <div className="container-x py-10">
        {q && results.length === 0 ? (
          <div className="rounded-lg border border-border p-10 text-center">
            <p className="text-lg font-medium">Ningún producto coincide con tu búsqueda.</p>
            <p className="mt-2 text-sm text-muted-foreground">Prueba con otra palabra como "proteína", "creatina" o "vitamina".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
