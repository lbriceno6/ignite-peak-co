import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import SeoLanding from "./SeoLanding";
import { CatalogFiltersPanel, applyCatalogFilters } from "@/components/catalog/CatalogFiltersPanel";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import type { SelectedFilters } from "@/lib/catalogFilterEngine";

const SITE_URL = "https://ignite-peak-co.lovable.app";
const sb: any = supabase;

type Goal = {
  id: string;
  name: string;
  slug: string;
  title_seo: string | null;
  meta_description: string | null;
  image_url: string | null;
  short_description: string | null;
  long_description: string | null;
  canonical_url: string | null;
  related_category_ids: string[];
  related_product_ids: string[];
};

export default function Goal() {
  const { slug } = useParams<{ slug: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundInGoals, setNotFoundInGoals] = useState(false);
  const [selected, setSelected] = useState<SelectedFilters>({});
  const { filters: catalogFilters } = useCatalogFilters("need");

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: g } = await sb.from("goals").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;

      // Fallback: si no existe en `goals`, intenta resolver desde `goal_cards`
      let resolved: Goal | null = (g as Goal) ?? null;
      let goalCardName: string | null = null;
      if (!resolved) {
        const { data: gc } = await sb.from("goal_cards").select("name,slug,description").eq("slug", slug).maybeSingle();
        if (!gc) {
          setNotFoundInGoals(true);
          setLoading(false);
          return;
        }
        goalCardName = (gc as any).name ?? null;
        resolved = {
          id: slug!, name: (gc as any).name, slug: (gc as any).slug,
          title_seo: null, meta_description: null, image_url: null,
          short_description: (gc as any).description ?? null, long_description: null,
          canonical_url: null, related_category_ids: [], related_product_ids: [],
        };
      } else {
        // Aunque sea goals, intenta obtener también el nombre visible del goal_card
        const { data: gc } = await sb.from("goal_cards").select("name").eq("slug", slug).maybeSingle();
        if (gc?.name) goalCardName = (gc as any).name;
      }
      setGoal(resolved);

      const ids: string[] = resolved.related_product_ids ?? [];
      const catIds: string[] = resolved.related_category_ids ?? [];

      let catNames: string[] = [];
      if (catIds.length) {
        const { data: cats } = await sb.from("categories").select("name").in("id", catIds);
        catNames = ((cats as any[]) ?? []).map((c) => c.name);
      }

      let q = sb.from("products")
        .select("id,slug,name,short_description,price,sale_price,main_image,category,rating,brand,stock,badge")
        .eq("is_active", true).eq("approval_status", "approved");

      if (ids.length && catNames.length) {
        q = q.or(`id.in.(${ids.join(",")}),category.in.(${catNames.map((n) => `"${n}"`).join(",")})`);
      } else if (ids.length) {
        q = q.in("id", ids);
      } else if (catNames.length) {
        q = q.in("category", catNames);
      } else {
        // Filtrar por products.goal = slug O por el nombre visible (compatibilidad)
        const names = Array.from(new Set([slug!, resolved.name, goalCardName].filter(Boolean))) as string[];
        q = q.in("goal", names);
      }
      const { data: prods } = await q.limit(60);
      if (!alive) return;
      setProducts((prods as any[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  const filtered = useMemo(
    () => applyCatalogFilters(products, selected, catalogFilters),
    [products, selected, catalogFilters],
  );

  if (notFoundInGoals) return <SeoLanding kind="objetivo" />;

  const title = goal?.title_seo || goal?.name || "Objetivo";
  const canonical = goal?.canonical_url || `${SITE_URL}/objetivo/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Objetivos", item: `${SITE_URL}/objetivos` },
      { "@type": "ListItem", position: 3, name: goal?.name ?? "Objetivo", item: canonical },
    ],
  };

  return (
    <Layout>
      <SEO
        title={title}
        description={goal?.meta_description ?? goal?.short_description ?? undefined}
        canonical={canonical}
        image={goal?.image_url ?? undefined}
        jsonLd={jsonLd}
      />
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Inicio</Link> /{" "}
            <Link to="/productos" className="hover:text-accent">Objetivos</Link> /{" "}
            <span className="text-foreground">{goal?.name}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{goal?.name}</h1>
          {goal?.short_description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{goal.short_description}</p>
          )}
        </div>
      </div>

      <div className="container-x py-10">
        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No hay productos asociados a este objetivo todavía.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <CatalogFiltersPanel
              page="need"
              products={products}
              selected={selected}
              onChange={setSelected}
              className="lg:sticky lg:top-24 lg:self-start"
            />
            <div>
              {filtered.length === 0 ? (
                <p className="text-muted-foreground">No hay productos que coincidan con los filtros.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={{
                      id: p.id, slug: p.slug, name: p.name,
                      shortBenefit: p.short_description ?? "",
                      price: Number(p.sale_price ?? p.price ?? 0),
                      oldPrice: p.sale_price ? Number(p.price) : undefined,
                      rating: Number(p.rating ?? 0), reviews: 0,
                      image: p.main_image ?? "/placeholder.svg",
                      category: p.category ?? "", goal: [], brand: p.brand ?? "",
                      label: p.badge as any,
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {goal?.long_description && (
          <article className="prose prose-sm mt-12 max-w-3xl text-muted-foreground">
            {goal.long_description}
          </article>
        )}
      </div>
    </Layout>
  );
}
