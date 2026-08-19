import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import {
  KIND_TO_FIELD, KIND_LABEL, landingPath, normalizeSections, itemLabel, slugify,
  type LandingKind, type NamedItem,
} from "@/lib/seoLanding";
import {
  CausesGrid, ChipList, InPageNav, LinkCards, LuciaBlock, ProfessionalHelp, RichText, SectionShell,
} from "@/components/landing/LandingSections";
import {
  EditorialIntro, FaqAccordion, FinalCta, IconCards, TrustStrip,
} from "@/components/landing/LandingBlocks";
import { SeoLandingHero, readingTimeFromText } from "@/components/landing/SeoLandingHero";



const PRODUCT_FIELDS =
  "id, slug, name, short_description, price, sale_price, main_image, category, subcategory, main_ingredient, rating, brand, gallery_images, size_variants, stock, badge";

const mapProduct = (p: any) => ({
  ...p,
  image: p.main_image ?? (Array.isArray(p.gallery_images) ? p.gallery_images[0] : null) ?? null,
  shortBenefit: p.short_description ?? "",
  oldPrice: p.sale_price && p.sale_price > 0 && p.sale_price < p.price ? p.price : undefined,
  price: p.sale_price && p.sale_price > 0 && p.sale_price < p.price ? p.sale_price : p.price,
});

/** Divide el HTML editorial en bloques por encabezados (h2/h3) para la maquetación en 2 columnas. */
function splitHtmlBlocks(html?: string | null): { title: string; content: string }[] {
  if (!html) return [];
  const parts = String(html).split(/<h[23][^>]*>/i).slice(1);
  const out: { title: string; content: string }[] = [];
  for (const part of parts) {
    const m = part.match(/^([\s\S]*?)<\/h[23]>([\s\S]*)$/i);
    if (!m) continue;
    const title = m[1].replace(/<[^>]+>/g, "").trim();
    const content = m[2].trim();
    if (title) out.push({ title, content });
  }
  return out;
}

const stripHtml = (html?: string | null) =>
  (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const summarize = (text: string, max = 320) => {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max) + "…";
};


export default function SeoLanding({ kind }: { kind: LandingKind }) {
  const { slug } = useParams<{ slug: string }>();
  const [landing, setLanding] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [existingLandings, setExistingLandings] = useState<Record<string, string>>({});
  const [testimonial, setTestimonial] = useState<{ caption: string; author: string } | null>(null);

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

      const p: any = page ?? null;
      let prods: any[] = [];

      const base = () =>
        supabase.from("products").select(PRODUCT_FIELDS)
          .eq("is_active", true).eq("approval_status", "approved");

      const manualIds: string[] = Array.isArray(p?.product_ids) ? p.product_ids.filter((x: any) => typeof x === "string") : [];
      if (p?.products_mode === "manual" && manualIds.length) {
        const { data } = await base().in("id", manualIds);
        prods = manualIds.map((id) => (data ?? []).find((d: any) => d.id === id)).filter(Boolean);
      }

      // 2) Filtro configurado (categoría / ingrediente / objetivo).
      if (!prods.length) {
        const field = p?.filter_field ?? KIND_TO_FIELD[kind];
        const value = p?.filter_value ?? slug.replace(/-/g, " ");
        const { data } = await base().ilike(field as any, `%${value}%`).limit(60);
        prods = data ?? [];
      }

      // 3) Fallback por nutrientes / ingredientes de la landing (nombre, ingrediente o descripción).
      if (!prods.length) {
        const secs = normalizeSections(p?.sections);
        const terms = [...(secs.nutrients ?? []), ...(secs.ingredients ?? [])]
          .map((n) => itemLabel(n).split(":")[0].trim())
          .filter((t) => t.length > 2)
          .slice(0, 8);
        if (terms.length) {
          const or = terms
            .flatMap((t) => [`name.ilike.%${t}%`, `main_ingredient.ilike.%${t}%`, `short_description.ilike.%${t}%`])
            .join(",");
          const { data } = await base().or(or).limit(24);
          prods = data ?? [];
        }
      }

      // 4) Fallback por palabra clave del título / slug en categoría o subcategoría.
      if (!prods.length) {
        const word = (p?.filter_value || slug.replace(/-/g, " ")).split(/[\s:]+/)[0];
        if (word && word.length > 2) {
          const { data } = await base()
            .or(`category.ilike.%${word}%,subcategory.ilike.%${word}%,name.ilike.%${word}%`)
            .limit(24);
          prods = data ?? [];
        }
      }

      // 5) Último recurso: productos mejor valorados del catálogo.
      if (!prods.length) {
        const { data } = await base().order("rating", { ascending: false }).limit(8);
        prods = data ?? [];
      }

      // Landings publicadas: para enlazar solo hacia recursos existentes.
      const { data: pubs } = await supabase
        .from("seo_landing_pages" as any)
        .select("kind, slug, title")
        .eq("is_published", true);
      const map: Record<string, string> = {};
      (pubs ?? []).forEach((l: any) => { map[`${l.kind}/${l.slug}`] = l.title; });

      // Testimonio real (nunca generado por IA); si no existe, la card se oculta.
      const { data: tst } = await supabase
        .from("testimonials")
        .select("caption, author_name")
        .eq("is_active", true)
        .not("caption", "is", null)
        .order("sort_order", { ascending: true })
        .limit(1);
      const t0: any = (tst ?? [])[0];

      if (!alive) return;
      setLanding(p);
      setProducts(prods.map(mapProduct));
      setExistingLandings(map);
      setTestimonial(t0?.caption && t0?.author_name ? { caption: t0.caption, author: t0.author_name } : null);
      setNotFound(!p && prods.length === 0);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [kind, slug]);


  useEffect(() => {
    if (!slug || loading) return;
    track("landing_page_view", { landing_slug: `${kind}/${slug}`, kind, results: products.length });
  }, [kind, slug, loading, products.length]);

  // Recomendación IA: máximo 4 productos del conjunto de la landing.
  const [aiPicks, setAiPicks] = useState<Array<{ slug: string; reason: string }> | null>(null);
  useEffect(() => {
    setAiPicks(null);
    if (loading || products.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase as any).functions.invoke("ai-product-related", {
          body: {
            product: { slug: `landing-${kind}-${slug}`, name: landing?.title || slug, category: landing?.category_name ?? null },
            catalog: products.map((p) => ({ slug: p.slug, name: p.name, category: p.category ?? null, price: p.price })),
            max: 4,
          },
        });
        if (alive) setAiPicks(Array.isArray(data?.picks) ? data.picks : []);
      } catch {
        if (alive) setAiPicks([]);
      }
    })();
    return () => { alive = false; };
  }, [loading, products, kind, slug, landing]);

  const recommended = useMemo(() => {
    if (!products.length) return [];
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const picked = (aiPicks ?? [])
      .map((pk) => ({ product: bySlug.get(pk.slug), reason: pk.reason }))
      .filter((x) => !!x.product) as { product: any; reason: string }[];
    const rest = products.filter((p) => !picked.some((x) => x.product.slug === p.slug));
    return [...picked, ...rest.map((product) => ({ product, reason: "" }))].slice(0, 4);
  }, [products, aiPicks]);

  // Contenido editorial (bloques por encabezado + resumen destacado).
  const editorial = useMemo(() => {
    const blocks = splitHtmlBlocks(landing?.body_html);
    const intro = landing?.intro ? String(landing.intro) : stripHtml(String(landing?.body_html ?? "").split(/<h[23]/i)[0]);
    return { blocks, highlight: summarize(intro, 340) };
  }, [landing]);

  const ctaText = useMemo(
    () => summarize(landing?.long_description || landing?.intro || stripHtml(landing?.body_html), 220),
    [landing],
  );


  const sections = useMemo(() => normalizeSections(landing?.sections), [landing]);

  const title = useMemo(() => {
    if (landing?.title) return landing.title;
    const pretty = (slug ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (kind === "objetivo") return `Suplementos para ${pretty}`;
    if (kind === "ingrediente") return `Productos con ${pretty}`;
    if (kind === "problema") return `${pretty}: causas, cuidados y nutrientes relacionados`;
    return `${pretty} — Beneficios y productos`;
  }, [landing, slug, kind]);

  const description =
    landing?.intro ??
    `Descubre los mejores productos seleccionados para ${slug?.replace(/-/g, " ")}. Calidad garantizada, envío rápido.`;

  const isHealth = kind === "problema";
  const path = landingPath(kind, slug ?? "");

  const readingTime = useMemo(
    () => readingTimeFromText(
      landing?.intro, landing?.body_html, landing?.long_description,
      sections.what_is?.content, sections.what_to_do, sections.nutrition,
      ...(sections.causes ?? []).map((c) => `${itemLabel(c)} ${c.description ?? ""}`),
      ...(sections.nutrients ?? []).map((c) => `${itemLabel(c)} ${c.description ?? ""}`),
      ...(Array.isArray(landing?.faqs) ? landing.faqs.map((f: any) => `${f.q} ${f.a}`) : []),
    ),
    [landing, sections],
  );


  const linkFor = (i: NamedItem, targetKind: string) => {
    const s = i.slug || slugify(itemLabel(i));
    return existingLandings[`${targetKind}/${s}`] ? landingPath(targetKind, s) : null;
  };

  const navItems = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (sections.what_is?.content) list.push({ id: "que-es", label: "Qué es" });
    if (sections.causes?.length) list.push({ id: "causas", label: "Causas" });
    if (sections.symptoms?.length) list.push({ id: "sintomas", label: "Síntomas" });
    if (sections.what_to_do) list.push({ id: "que-hacer", label: "Qué hacer" });
    if (sections.nutrition) list.push({ id: "alimentacion", label: "Alimentación" });
    if (sections.nutrients?.length) list.push({ id: "nutrientes", label: "Nutrientes" });
    if (products.length) list.push({ id: "productos", label: "Productos" });
    if (Array.isArray(landing?.faqs) && landing.faqs.length) list.push({ id: "faq", label: "Preguntas frecuentes" });
    return list;
  }, [sections, products.length, landing]);

  const jsonLd = useMemo(() => {
    const blocks: Record<string, unknown>[] = [];
    const faqs = Array.isArray(landing?.faqs) ? landing.faqs : [];
    blocks.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: landing?.meta_title || title,
      description: landing?.meta_description || description,
      url: `https://nutribatidos.com${path}`,
    });
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://nutribatidos.com/" },
        { "@type": "ListItem", position: 2, name: isHealth ? "Salud" : kind, item: `https://nutribatidos.com/${isHealth ? "salud" : kind}` },
        { "@type": "ListItem", position: 3, name: title, item: `https://nutribatidos.com${path}` },
      ],
    });
    if (faqs.length) {
      blocks.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    }
    return blocks;
  }, [landing, title, description, path, isHealth, kind]);

  const askLucia = () => {
    window.dispatchEvent(new CustomEvent("lucia:open", {
      detail: {
        landing_type: isHealth ? "health_topic" : kind,
        landing_slug: slug,
        landing_title: title,
        category: landing?.category_name ?? null,
      },
    }));
  };

  if (notFound) return <Navigate to="/productos" replace />;

  const isDraft = landing && landing.is_published === false;

  return (
    <Layout>
      <SEO
        title={landing?.meta_title || title}
        description={landing?.meta_description || description}
        path={path}
        canonical={landing?.canonical || undefined}
        image={landing?.og_image || landing?.hero_image || undefined}
        ogTitle={landing?.og_title || undefined}
        ogDescription={landing?.og_description || undefined}
        robots={landing?.noindex || isDraft ? "noindex,nofollow" : undefined}
        jsonLd={landing?.schema_jsonld && !isHealth ? landing.schema_jsonld : (jsonLd as any)}
      />

      {/* HERO editorial */}
      <SeoLandingHero
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: isHealth ? "Salud" : KIND_LABEL[kind] ?? kind, href: isHealth ? "/salud" : undefined },
          ...(landing?.category_name ? [{ label: landing.category_name as string }] : []),
          { label: title },
        ]}
        category={
          landing?.category_name ||
          landing?.filter_value ||
          (isHealth ? "Para tu salud" : KIND_LABEL[kind] ?? null)
        }
        title={title}
        shortDescription={description}
        heroImage={landing?.hero_image ?? null}
        imageAlt={landing?.hero_image_alt ?? null}
        readingTime={readingTime}
        cta={
          products.length > 0
            ? { label: landing?.hero_cta_label || "Ver productos relacionados", href: landing?.hero_cta_href || "#productos" }
            : null
        }
      />

      <div className="container-x space-y-12 pb-10 pt-16 md:pt-20">

        {isHealth && <InPageNav items={navItems} />}

        {/* Introducción / contenido general en 2 columnas */}
        {!isHealth && (editorial.blocks.length > 0 || editorial.highlight) && (
          <EditorialIntro
            highlightTitle={`¿Por qué son importantes ${(landing?.category_name || landing?.filter_value || "estos nutrientes").toString().toLowerCase()}?`}
            highlightText={editorial.highlight}
            perks={[{ label: "Energía" }, { label: "Defensas" }, { label: "Bienestar diario" }]}
            blocks={editorial.blocks}
          />
        )}
        {!isHealth && editorial.blocks.length === 0 && landing?.body_html && (
          <RichText html={landing.body_html} />
        )}


        {isHealth && (
          <>
            {sections.what_is?.content && (
              <SectionShell id="que-es" title={sections.what_is.title || `¿Qué es ${title}?`}>
                <RichText html={sections.what_is.content} />
              </SectionShell>
            )}

            {!!sections.causes?.length && (
              <SectionShell id="causas" title="Causas más frecuentes">
                <CausesGrid items={sections.causes} />
              </SectionShell>
            )}

            {!!sections.symptoms?.length && (
              <SectionShell id="sintomas" title="Síntomas relacionados">
                <ChipList items={sections.symptoms} />
              </SectionShell>
            )}

            {sections.what_to_do && (
              <SectionShell id="que-hacer" title="¿Qué puedes hacer?">
                <RichText html={sections.what_to_do} />
              </SectionShell>
            )}

            {sections.nutrition && (
              <SectionShell id="alimentacion" title="Alimentación y cuidado" soft>
                <RichText html={sections.nutrition} />
              </SectionShell>
            )}

            {landing?.body_html && <RichText html={landing.body_html} />}
          </>
        )}

        {!!sections.nutrients?.length && (
          <SectionShell id="nutrientes" title="Nutrientes relacionados">
            <IconCards
              items={sections.nutrients}
              hrefFor={(n) => linkFor(n, "ingrediente") ?? linkFor(n, "beneficio")}
            />
          </SectionShell>
        )}

        {!!sections.ingredients?.length && (
          <SectionShell id="ingredientes" title="Ingredientes que puedes encontrar en Nutribatidos">
            <IconCards items={sections.ingredients} hrefFor={(n) => linkFor(n, "ingrediente")} compact />
          </SectionShell>
        )}


        {/* PRODUCTOS RECOMENDADOS POR IA (máx. 4) — se oculta si no hay productos */}
        {(loading || recommended.length > 0) && (
          <section id="productos" className="scroll-mt-24">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
              <Sparkles size={12} /> Recomendado por IA
            </p>
            <h2 className="mt-1 font-display text-2xl uppercase sm:text-3xl">Combínalo con esto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Productos seleccionados para acompañar tu bienestar diario.
            </p>
            <div className="mt-5">
              {loading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {recommended.map(({ product, reason }) => (
                    <div key={product.id} className="flex flex-col gap-2">
                      <ProductCard product={product as any} />
                      {reason && (
                        <p className="px-1 text-xs text-muted-foreground">
                          <Sparkles size={10} className="mr-1 inline -translate-y-0.5 text-accent" />
                          {reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {recommended.length > 0 && !loading && <TrustStrip />}



        {isHealth && <LuciaBlock onAsk={askLucia} />}

        {!!sections.related_topics?.length ? (
          <SectionShell title="También podría interesarte">
            <LinkCards items={sections.related_topics} hrefFor={(t) => linkFor(t, "problema")} ctaLabel={() => "Ver más →"} />
          </SectionShell>
        ) : (
          (() => {
            const others = Object.entries(existingLandings)
              .filter(([key]) => key !== `${kind}/${slug}`)
              .slice(0, 6)
              .map(([key, t]) => ({ name: t, href: `/${key.split("/")[0] === "problema" ? "salud" : key.split("/")[0]}/${key.split("/")[1]}` }));
            return others.length > 0 ? (
              <SectionShell title="También podría interesarte">
                <LinkCards items={others as NamedItem[]} hrefFor={(t) => (t as any).href} ctaLabel={() => "Ver más →"} />
              </SectionShell>
            ) : null;
          })()
        )}


        {Array.isArray(landing?.faqs) && landing.faqs.length > 0 && (
          <FaqAccordion faqs={landing.faqs} />
        )}


        {isHealth && <ProfessionalHelp text={sections.professional_help} />}

        <FinalCta
          title={`Elige ${(landing?.category_name || landing?.filter_value || title).toString().toLowerCase()} para acompañar tu bienestar diario`}
          text={ctaText}
          image={landing?.cta_image || null}
          testimonial={testimonial}
          onAskLucia={askLucia}
        />

      </div>
    </Layout>
  );
}
