import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://ignite-peak-co.lovable.app";
const sb: any = supabase;

type GoalCard = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  short_description: string | null;
};

export default function Goals() {
  const [goals, setGoals] = useState<GoalCard[]>([]);

  useEffect(() => {
    sb.from("goals")
      .select("id,name,slug,image_url,short_description")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: any) => setGoals(data ?? []));
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Compra por objetivo",
    url: `${SITE_URL}/objetivos`,
    hasPart: goals.map((g) => ({
      "@type": "CollectionPage",
      name: g.name,
      url: `${SITE_URL}/objetivo/${g.slug}`,
    })),
  };

  return (
    <Layout>
      <SEO
        title="Compra por objetivo | Nutribatidos"
        description="Encuentra productos según tu meta: energía, belleza, digestión, rendimiento y más."
        canonical={`${SITE_URL}/objetivos`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-x py-10">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Compra por objetivo</span>
        </nav>
        <h1 className="font-display text-3xl md:text-4xl">Compra por objetivo</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Encuentra los productos perfectos según lo que buscas: energía, belleza, digestión, rendimiento y más.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <Link
              key={g.id}
              to={`/objetivo/${g.slug}`}
              className="group flex gap-4 overflow-hidden rounded-lg border border-border bg-card p-4 transition-smooth hover:border-accent hover:shadow-md"
            >
              {g.image_url ? (
                <img src={g.image_url} alt={g.name} className="h-20 w-20 shrink-0 rounded object-cover" loading="lazy" />
              ) : (
                <div className="h-20 w-20 shrink-0 rounded bg-accent/10" />
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-accent">{g.name}</h2>
                {g.short_description && (
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{g.short_description}</p>
                )}
              </div>
            </Link>
          ))}
          {goals.length === 0 && (
            <p className="text-muted-foreground">Pronto encontrarás aquí más objetivos.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
