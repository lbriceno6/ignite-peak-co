import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Truck, ShieldCheck, Award, MessageCircle, Flame, Scale, Leaf, Bone, Sparkles, Shield, HeartPulse, Droplets } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { Layout } from "@/components/Layout";
import { SeoFromMeta } from "@/components/SeoFromMeta";
import { InstagramTestimonials } from "@/components/InstagramTestimonials";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ProductCard } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { goals as fallbackGoals, reviews, type Product } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useProductsCarouselConfig } from "@/hooks/useProductsCarouselConfig";
import { HomeProductsCarousel } from "@/components/HomeProductsCarousel";
import { PromotionsCarousel } from "@/components/PromotionsCarousel";
import { resolveProductImage } from "@/lib/productImage";

import heroImage from "@/assets/hero.jpg";
import promoImage from "@/assets/promo-banner.jpg";
import productPlaceholder from "@/assets/product-protein.jpg";
import { ComboRecommendations } from "@/components/combos/ComboRecommendations";
import DOMPurify from "dompurify";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type HeroSlide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  primary_label: string | null;
  primary_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  category: string | null;
  main_image: string | null;
  gallery_images?: any;
  badge: string | null;
};

type DbCategory = { name: string; slug: string; icon: string | null; sort_order: number };
type DbPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  cover_image: string | null;
  published_at: string;
};

type HomeBlock = {
  id: string;
  block_key: string;
  block_type: string;
  sort_order: number;
  is_active: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  cta2_label: string | null;
  cta2_href: string | null;
  image_url: string | null;
  settings: Record<string, any> | null;
};

type GoalCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
};

type GoalStyle = {
  bg: string;
  glow: string;
  iconColor: string;
  icon: typeof Flame;
};

const goalStylePalette: GoalStyle[] = [
  { bg: "bg-gradient-to-br from-orange-50 to-amber-100", glow: "bg-orange-300", iconColor: "text-orange-600", icon: Flame },
  { bg: "bg-gradient-to-br from-emerald-50 to-green-100", glow: "bg-emerald-300", iconColor: "text-emerald-600", icon: Leaf },
  { bg: "bg-gradient-to-br from-sky-50 to-blue-100", glow: "bg-sky-300", iconColor: "text-sky-600", icon: Droplets },
  { bg: "bg-gradient-to-br from-rose-50 to-pink-100", glow: "bg-rose-300", iconColor: "text-rose-600", icon: HeartPulse },
  { bg: "bg-gradient-to-br from-violet-50 to-purple-100", glow: "bg-violet-300", iconColor: "text-violet-600", icon: Sparkles },
  { bg: "bg-gradient-to-br from-stone-50 to-amber-50", glow: "bg-amber-200", iconColor: "text-amber-700", icon: Bone },
  { bg: "bg-gradient-to-br from-cyan-50 to-teal-100", glow: "bg-teal-300", iconColor: "text-teal-600", icon: Shield },
  { bg: "bg-gradient-to-br from-yellow-50 to-orange-100", glow: "bg-yellow-300", iconColor: "text-yellow-700", icon: Scale },
];

const goalKeywordMap: Array<{ test: RegExp; style: GoalStyle }> = [
  { test: /energ|vital/i, style: { ...goalStylePalette[0], icon: Flame } },
  { test: /peso|delgad|adelg/i, style: { ...goalStylePalette[7], icon: Scale } },
  { test: /digesti|colon|estom/i, style: { ...goalStylePalette[1], icon: Leaf } },
  { test: /articul|hueso|movil/i, style: { ...goalStylePalette[5], icon: Bone } },
  { test: /defens|inmun/i, style: { ...goalStylePalette[6], icon: Shield } },
  { test: /masculin|próstata|prostata/i, style: { ...goalStylePalette[2], icon: Shield } },
  { test: /h[ií]gado|limpieza|detox/i, style: { ...goalStylePalette[1], icon: Droplets } },
  { test: /bienestar|diario|rutina/i, style: { ...goalStylePalette[4], icon: Sparkles } },
  { test: /coraz[oó]n|circul/i, style: { ...goalStylePalette[3], icon: HeartPulse } },
];

const getGoalStyle = (name: string, index: number): GoalStyle => {
  const match = goalKeywordMap.find((g) => g.test.test(name));
  return match?.style ?? goalStylePalette[index % goalStylePalette.length];
};

const toCardProduct = (p: DbProduct): Product => {
  const label = (["Best Seller", "New", "Offer"] as const).find(
    (l) => l.toLowerCase() === (p.badge ?? "").toLowerCase(),
  );
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortBenefit: p.short_description ?? "",
    price: Number(p.sale_price ?? p.price),
    oldPrice: p.sale_price ? Number(p.price) : undefined,
    rating: 4.8,
    reviews: 0,
    label,
    image: resolveProductImage(p.main_image, productPlaceholder),
    category: p.category ?? "",
    goal: [],
    brand: "Nutribatidos",
  };
};

const GUIDES_KEYS = [
  "home.guides.eyebrow",
  "home.guides.title",
  "home.guides.subtitle",
  "home.guides.cta_label",
  "home.guides.cta_href",
];

const Home = () => {
  
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [blocks, setBlocks] = useState<HomeBlock[]>([]);
  const [goalCards, setGoalCards] = useState<GoalCard[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }));
  const { content } = useSiteContent(GUIDES_KEYS, {
    "home.guides.eyebrow": "Conocimiento",
    "home.guides.title": "Guías y consejos",
    "home.guides.subtitle": "",
    "home.guides.cta_label": "Todos los artículos",
    "home.guides.cta_href": "/blog",
  });
  const { config: carouselConfig } = useProductsCarouselConfig();

  const loadAll = async () => {
    const [p, c, featured, recent, hero, blk, gc] = await Promise.all([
      supabase.from("products").select("id,slug,name,short_description,price,sale_price,category,main_image,gallery_images,badge").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("name,slug,icon,sort_order").eq("type", "product").order("sort_order").order("name"),
      supabase.from("blog_posts").select("id,slug,title,excerpt,category,read_time,cover_image,published_at,is_featured,featured_order").eq("is_published", true).eq("is_featured", true).order("featured_order", { ascending: true, nullsFirst: false }).order("published_at", { ascending: false }).limit(3),
      supabase.from("blog_posts").select("id,slug,title,excerpt,category,read_time,cover_image,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
      supabase.from("hero_slides").select("id,eyebrow,title,subtitle,image_url,primary_label,primary_href,secondary_label,secondary_href").eq("is_active", true).order("sort_order").order("created_at"),
      supabase.from("home_blocks").select("*").eq("is_active", true).eq("is_deleted", false).order("sort_order"),
      supabase.from("goal_cards").select("id,slug,name,description,cta_label,cta_href").eq("is_active", true).order("sort_order").order("created_at"),
    ]);
    setProducts((p.data as DbProduct[]) ?? []);
    setCategories((c.data as DbCategory[]) ?? []);
    const f = (featured.data as DbPost[]) ?? [];
    const r = (recent.data as DbPost[]) ?? [];
    const ids = new Set(f.map((x) => x.id));
    const merged = [...f, ...r.filter((x) => !ids.has(x.id))].slice(0, 3);
    setPosts(merged);
    setSlides((hero.data as HeroSlide[]) ?? []);
    setBlocks((blk.data as HomeBlock[]) ?? []);
    setGoalCards((gc.data as GoalCard[]) ?? []);
  };

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_slides" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "home_blocks" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_cards" }, () => loadAll())
      .subscribe();
    const onFocus = () => loadAll();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi]);

  const bestSellers = products
    .filter((p) => (p.badge ?? "").toLowerCase() === "best seller")
    .slice(0, 4);
  const bestSellersDisplay = (bestSellers.length ? bestSellers : products.slice(0, 4)).map(toCardProduct);
  const moreProducts = products.slice(0, 8).map(toCardProduct);

  const carouselProducts = (() => {
    if (!carouselConfig) return [] as Product[];
    const total = carouselConfig.total_items || 8;
    let pool = products;
    switch (carouselConfig.source) {
      case "manual": {
        const order = carouselConfig.manual_slugs;
        const bySlug = new Map(products.map((p) => [p.slug, p]));
        return order.map((s) => bySlug.get(s)).filter(Boolean).map((p) => toCardProduct(p as DbProduct));
      }
      case "best_sellers":
        pool = [
          ...products.filter((p) => (p.badge ?? "").toLowerCase() === "best seller"),
          ...products.filter((p) => (p.badge ?? "").toLowerCase() !== "best seller"),
        ];
        break;
      case "popular":
        pool = [...products].sort((a, b) => Number(b.sale_price ?? 0) - Number(a.sale_price ?? 0));
        break;
      case "sale":
        pool = products.filter((p) => p.sale_price != null && Number(p.sale_price) > 0);
        break;
      case "top_rated":
        pool = [...products]; // ordering by rating happens server-side; fallback: keep as-is
        break;
      case "recent":
      default:
        pool = products; // already ordered by created_at desc from query
    }
    return pool.slice(0, total).map(toCardProduct);
  })();

  const renderBlock = (b: HomeBlock) => {
    switch (b.block_type) {
      case "hero": {
        const displaySlides: HeroSlide[] = slides.length
          ? slides
          : [{
              id: "fallback",
              eyebrow: "100% peruano",
              title: "Energía que viene de los Andes",
              subtitle: "Maca, cañihua y espirulina. Superalimentos puros, sin saborizantes ni químicos. Como lo hacían nuestras abuelas.",
              image_url: null,
              primary_label: "Ver productos",
              primary_href: "/categoria/nb-superalimentos",
              secondary_label: "Hablar por WhatsApp",
              secondary_href: "https://wa.me/51999999999",
            }];
        return (
          <section key={b.id} className="relative bg-surface-darker text-background">
            <Carousel
              opts={{ loop: displaySlides.length > 1 }}
              plugins={displaySlides.length > 1 ? [autoplay.current] : []}
              setApi={setCarouselApi}
              className="relative"
            >
              <CarouselContent className="ml-0">
                {displaySlides.map((s) => (
                  <CarouselItem key={s.id} className="pl-0">
                    <div className="relative overflow-hidden">
                      <img
                        src={s.image_url || heroImage}
                        alt={s.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-surface-darker via-surface-darker/80 to-transparent" />
                      <div className="container-x relative grid min-h-[560px] items-center py-20 lg:min-h-[680px]">
                        <div className="max-w-2xl">
                          {s.eyebrow && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold tracking-wide text-accent">
                              <Zap size={12} /> {s.eyebrow}
                            </span>
                          )}
                          <h1 className="mt-6 font-display text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
                            {s.title}
                          </h1>
                          {s.subtitle && (
                            <p className="mt-6 max-w-xl text-base text-background/75 sm:text-lg">{s.subtitle}</p>
                          )}
                          <div className="mt-8 flex flex-wrap gap-3">
                            {s.primary_label && s.primary_href && (
                              <Button size="xl" variant="hero" asChild>
                                <Link to={s.primary_href}>{s.primary_label} <ArrowRight /></Link>
                              </Button>
                            )}
                            {s.secondary_label && s.secondary_href && (
                              <Button size="xl" variant="outline" asChild className="border-background/30 bg-background/5 text-background hover:bg-background hover:text-foreground">
                                <Link to={s.secondary_href}>{s.secondary_label}</Link>
                              </Button>
                            )}
                          </div>
                          <div className="mt-10 flex items-center gap-4 text-sm text-background/70">
                            <div className="flex items-center gap-2">
                              <Stars rating={5} />
                              <span className="font-semibold text-background">4.9/5</span>
                            </div>
                            <span className="text-background/40">·</span>
                            <span>Hecho en Perú · Envíos a todo el país en 24-48 horas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {displaySlides.length > 1 && (
                <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                  {displaySlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Ir a la diapositiva ${i + 1}`}
                      onClick={() => carouselApi?.scrollTo(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentSlide ? "w-8 bg-accent" : "w-4 bg-background/40 hover:bg-background/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </Carousel>
          </section>
        );
      }

      case "categories":
        if (!categories.length) return null;
        return (
          <section key={b.id} className="container-x py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl">{b.title || "Comprar por categoría"}</h2>
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/categoria/${c.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-5 text-center transition-smooth hover:border-accent hover:shadow-product hover:-translate-y-1"
                >
                  <span className="text-3xl">{c.icon || "🏷️"}</span>
                  <span className="text-sm font-bold tracking-wide group-hover:text-accent">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        );

      case "best_sellers": {
        if (!carouselConfig || !carouselConfig.is_active) return null;
        const items = carouselProducts.length ? carouselProducts : bestSellersDisplay;
        if (!items.length) return null;
        return (
          <HomeProductsCarousel
            key={b.id}
            config={carouselConfig}
            products={items}
            eyebrow={b.eyebrow}
          />
        );
      }

      case "promotions_carousel":
        return (
          <PromotionsCarousel
            key={b.id}
            block={{
              id: b.id,
              eyebrow: b.eyebrow,
              title: b.title,
              subtitle: b.subtitle,
              cta_label: b.cta_label,
              cta_href: b.cta_href,
              settings: b.settings ?? {},
            }}
            products={products}
          />
        );



      case "goals": {
        const displayGoals = goalCards.length
          ? goalCards.map((g) => ({
              key: g.id,
              name: g.name,
              desc: g.description ?? "",
              href: g.cta_href || `/category/goal-${g.slug}`,
              ctaLabel: g.cta_label,
            }))
          : fallbackGoals.map((g) => ({
              key: g.slug,
              name: g.name,
              desc: g.desc,
              href: `/category/goal-${g.slug}`,
              ctaLabel: null as string | null,
            }));
        return (
          <section key={b.id} className="container-x py-16">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                {b.eyebrow || "Encuentra tu stack"}
              </span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl">
                {b.title || "Comprar por objetivo"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                {b.subtitle || "Explora productos según tu necesidad o estilo de vida"}
              </p>
            </div>

            {/* Desktop grid / Mobile horizontal snap carousel */}
            <div className="mt-10 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-5 sm:overflow-visible">
              {displayGoals.map((g, i) => {
                const style = getGoalStyle(g.name, i);
                const Icon = style.icon;
                return (
                  <Link
                    key={g.key}
                    to={g.href}
                    className={`group relative flex min-w-[78%] snap-start flex-col justify-between overflow-hidden rounded-2xl border border-border/40 p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-elevated sm:min-w-0 ${style.bg}`}
                    style={{ minHeight: 280 }}
                  >
                    {/* Soft decorative glow */}
                    <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-80 ${style.glow}`} />

                    {/* Floating icon "image" */}
                    <div className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm shadow-md transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-110 ${style.iconColor}`}>
                      <Icon size={40} strokeWidth={1.75} />
                    </div>

                    <div className="relative z-10 mt-6">
                      <h3 className="font-display text-2xl leading-tight text-foreground">{g.name}</h3>
                      {g.desc && (
                        <p className="mt-2 text-sm text-foreground/70 line-clamp-2">{g.desc}</p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground/80 transition-all duration-300 group-hover:gap-2 group-hover:text-accent">
                        {g.ctaLabel || "Ver productos"} <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      }

      case "promo":
        return (
          <section key={b.id} className="container-x">
            <div className="relative overflow-hidden rounded-2xl bg-surface-darker text-background">
              <img
                src={b.image_url || promoImage}
                alt={b.title || "Oferta promocional"}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-darker via-surface-darker/70 to-transparent" />
              <div className="relative grid min-h-[340px] items-center p-8 sm:p-12 lg:p-16">
                <div className="max-w-lg">
                  {b.eyebrow && (
                    <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold tracking-wide text-accent-foreground">
                      {b.eyebrow}
                    </span>
                  )}
                  <h3 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
                    {b.title || "Combina y ahorra hasta 30%."}
                  </h3>
                  {b.subtitle && <p className="mt-3 text-background/75">{b.subtitle}</p>}
                  {b.cta_label && b.cta_href && (
                    <Button size="lg" variant="hero" className="mt-6" asChild>
                      <Link to={b.cta_href}>{b.cta_label} <ArrowRight /></Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case "products_grid":
        if (!moreProducts.length) return null;
        return (
          <section key={b.id} className="container-x py-16">
            <div>
              {b.eyebrow && <span className="text-xs font-bold tracking-wide text-accent">{b.eyebrow}</span>}
              <h2 className="mt-1 font-display text-3xl sm:text-4xl">{b.title || "Complementa tu rutina diaria"}</h2>
              {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {moreProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        );

      case "reviews":
        return (
          <section key={b.id} className="bg-surface-darker py-16 text-background">
            <div className="container-x">
              <div className="text-center">
                <Stars rating={5} size={20} />
                <h2 className="mt-3 font-display text-3xl sm:text-4xl">{b.title || "Lo que dicen nuestras clientas"}</h2>
                {b.subtitle && <p className="mt-2 text-background/60">{b.subtitle}</p>}
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {reviews.map((r) => (
                  <div key={r.name} className="rounded-lg border border-background/10 bg-background/5 p-6">
                    <Stars rating={r.rating} />
                    <h4 className="mt-3 font-display text-lg">{r.title}</h4>
                    <p className="mt-2 text-sm text-background/70">{r.text}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-background/60">
                      <span className="font-semibold text-background">{r.name}</span>
                      {r.verified && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">Comprador verificado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case "blog":
        if (!posts.length) return null;
        return (
          <section key={b.id} className="container-x py-16">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold tracking-wide text-accent">{b.eyebrow || content["home.guides.eyebrow"]}</span>
                <h2 className="mt-1 font-display text-3xl sm:text-4xl">{b.title || content["home.guides.title"]}</h2>
                {(b.subtitle || content["home.guides.subtitle"]) && (
                  <p className="mt-2 max-w-xl text-muted-foreground">{b.subtitle || content["home.guides.subtitle"]}</p>
                )}
              </div>
              <Link to={b.cta_href || content["home.guides.cta_href"] || "/blog"} className="hidden text-sm font-semibold tracking-wide hover:text-accent sm:inline-flex sm:items-center sm:gap-1">
                {b.cta_label || content["home.guides.cta_label"]} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group flex flex-col gap-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gradient-hero">
                    {post.cover_image ? (
                      <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover transition-smooth group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-6xl opacity-30">📝</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground">
                    {post.category && <span className="text-accent font-bold">{post.category}</span>}
                    {post.read_time && <span>· {post.read_time} de lectura</span>}
                  </div>
                  <h3 className="font-display text-xl group-hover:text-accent transition-smooth">{post.title}</h3>
                  {post.excerpt && <p className="text-sm text-muted-foreground">{post.excerpt}</p>}
                </Link>
              ))}
            </div>
          </section>
        );

      case "trust":
        return (
          <section key={b.id} className="border-y border-border bg-secondary/40 py-12">
            <div className="container-x grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { icon: Truck, title: "Envío rápido", desc: "A todo el Perú en 24-48h" },
                { icon: ShieldCheck, title: "Pago seguro", desc: "Yape, Plin, tarjeta o contraentrega" },
                { icon: Award, title: "100% natural", desc: "Sin químicos ni saborizantes" },
                { icon: MessageCircle, title: "Atención cercana", desc: "WhatsApp los 7 días" },
              ].map((t) => (
                <div key={t.title} className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <t.icon size={22} />
                  </div>
                  <div>
                    <p className="font-bold tracking-wide">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case "nutrition_advisory":
        return (
          <section key={b.id} className="container-x py-16">
            <div className="grid overflow-hidden rounded-2xl border bg-card shadow-product md:grid-cols-2">
              <div className="relative min-h-[280px] bg-muted md:min-h-[420px]">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title || "Asesoría nutricional"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full place-items-center text-6xl opacity-30">🥗</div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
                {b.eyebrow && (
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-bold tracking-wide text-success">
                    {b.eyebrow}
                  </span>
                )}
                <h2 className="font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
                  {b.title || "Nutribatidos + Asesoría nutricional"}
                </h2>
                {b.subtitle && <p className="text-muted-foreground sm:text-lg">{b.subtitle}</p>}
                {b.cta_label && b.cta_href && (
                  <Button
                    size="xl"
                    className="mt-2 w-fit gap-2 bg-success text-background hover:bg-success/90"
                    asChild
                  >
                    <a href={b.cta_href} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={20} /> {b.cta_label}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </section>
        );

      case "custom_simple": {
        const s = (b.settings ?? {}) as Record<string, any>;
        const align: "left" | "center" | "right" = ["left", "center", "right"].includes(s.alignment) ? s.alignment : "left";
        const bg = typeof s.bg_color === "string" && s.bg_color.trim() ? s.bg_color : undefined;
        const alignClass = align === "center" ? "text-center items-center" : align === "right" ? "text-right items-end" : "text-left items-start";
        return (
          <section key={b.id} className="py-12" style={bg ? { backgroundColor: bg } : undefined}>
            <div className={`container-x flex flex-col gap-4 ${alignClass}`}>
              {b.image_url && (
                <img src={b.image_url} alt={b.title || ""} className="max-h-80 w-auto rounded-lg object-cover" loading="lazy" />
              )}
              {b.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{b.eyebrow}</span>}
              {b.title && <h2 className="font-display text-3xl sm:text-4xl">{b.title}</h2>}
              {b.subtitle && <p className="max-w-2xl text-muted-foreground">{b.subtitle}</p>}
              {b.cta_label && b.cta_href && (
                <Button asChild variant="dark" className="mt-2 w-fit"><Link to={b.cta_href}>{b.cta_label} <ArrowRight size={16} /></Link></Button>
              )}
            </div>
          </section>
        );
      }

      case "custom_html": {
        const html = String((b.settings as any)?.html ?? "");
        if (!html.trim()) return null;
        const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
        return (
          <section key={b.id} className="container-x py-8">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: safe }} />
          </section>
        );
      }

      case "brands": {
        const logos: Array<{ url: string; alt?: string; href?: string }> = Array.isArray((b.settings as any)?.logos) ? (b.settings as any).logos : [];
        const valid = logos.filter((l) => l && typeof l.url === "string" && l.url.trim());
        if (!valid.length) return null;
        const colsRaw = Number((b.settings as any)?.columns ?? 5);
        const cols = Math.min(8, Math.max(2, Number.isFinite(colsRaw) ? colsRaw : 5));
        const grayscale = (b.settings as any)?.grayscale !== false;
        const colsClass: Record<number, string> = {
          2: "grid-cols-2 md:grid-cols-2",
          3: "grid-cols-2 md:grid-cols-3",
          4: "grid-cols-2 md:grid-cols-4",
          5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
          6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6",
          7: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
          8: "grid-cols-2 sm:grid-cols-4 md:grid-cols-8",
        };
        return (
          <section key={b.id} className="container-x py-12">
            {(b.eyebrow || b.title || b.subtitle) && (
              <div className="mb-8 text-center">
                {b.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{b.eyebrow}</span>}
                {b.title && <h2 className="mt-2 font-display text-2xl sm:text-3xl">{b.title}</h2>}
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
            )}
            <div className={`grid items-center gap-6 ${colsClass[cols]}`}>
              {valid.map((l, i) => {
                const img = (
                  <img
                    src={l.url}
                    alt={l.alt || ""}
                    loading="lazy"
                    className={`max-h-14 w-auto object-contain transition ${grayscale ? "grayscale opacity-70 hover:grayscale-0 hover:opacity-100" : ""}`}
                  />
                );
                return (
                  <div key={i} className="flex items-center justify-center">
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.alt || `brand-${i}`}>{img}</a>
                    ) : img}
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case "faq": {
        const items: Array<{ q: string; a: string }> = Array.isArray((b.settings as any)?.items) ? (b.settings as any).items : [];
        const valid = items.filter((it) => it && (it.q?.trim() || it.a?.trim()));
        if (!valid.length) return null;
        return (
          <section key={b.id} className="container-x py-16">
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                {b.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{b.eyebrow}</span>}
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">{b.title || "Preguntas frecuentes"}</h2>
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
              <Accordion type="single" collapsible className="mt-8">
                {valid.map((it, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{it.q || `Pregunta ${i + 1}`}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-line">{it.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        );
      }

      case "image_text": {
        const side: "left" | "right" = (b.settings as any)?.image_side === "right" ? "right" : "left";
        const bg = typeof (b.settings as any)?.bg_color === "string" && (b.settings as any).bg_color.trim() ? (b.settings as any).bg_color : undefined;
        const imageBlock = (
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-muted md:min-h-[420px]">
            {b.image_url ? (
              <img src={b.image_url} alt={b.title || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-6xl opacity-30">🖼️</div>
            )}
          </div>
        );
        const textBlock = (
          <div className="flex flex-col justify-center gap-4">
            {b.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{b.eyebrow}</span>}
            {b.title && <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight">{b.title}</h2>}
            {b.subtitle && <p className="text-muted-foreground sm:text-lg whitespace-pre-line">{b.subtitle}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              {b.cta_label && b.cta_href && (
                <Button asChild variant="dark"><Link to={b.cta_href}>{b.cta_label} <ArrowRight size={16} /></Link></Button>
              )}
              {b.cta2_label && b.cta2_href && (
                <Button asChild variant="outline"><Link to={b.cta2_href}>{b.cta2_label}</Link></Button>
              )}
            </div>
          </div>
        );
        return (
          <section key={b.id} className="py-16" style={bg ? { backgroundColor: bg } : undefined}>
            <div className="container-x grid items-center gap-8 md:grid-cols-2">
              {side === "left" ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
            </div>
          </section>
        );
      }

      case "video": {
        const s = (b.settings ?? {}) as Record<string, any>;
        const url: string = typeof s.video_url === "string" ? s.video_url.trim() : "";
        if (!url) return null;
        const autoplay = !!s.autoplay;
        const muted = s.muted !== false;
        const loop = !!s.loop;
        const cover = typeof s.cover_image === "string" ? s.cover_image : "";

        // Detect provider
        let embedUrl = "";
        let isFile = false;
        const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
        const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        if (yt) {
          const p = new URLSearchParams();
          if (autoplay) p.set("autoplay", "1");
          if (muted || autoplay) p.set("mute", "1");
          if (loop) { p.set("loop", "1"); p.set("playlist", yt[1]); }
          embedUrl = `https://www.youtube.com/embed/${yt[1]}?${p.toString()}`;
        } else if (vimeo) {
          const p = new URLSearchParams();
          if (autoplay) p.set("autoplay", "1");
          if (muted || autoplay) p.set("muted", "1");
          if (loop) p.set("loop", "1");
          embedUrl = `https://player.vimeo.com/video/${vimeo[1]}?${p.toString()}`;
        } else {
          isFile = true;
        }

        return (
          <section key={b.id} className="container-x py-16">
            {(b.eyebrow || b.title || b.subtitle) && (
              <div className="mb-8 text-center">
                {b.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{b.eyebrow}</span>}
                {b.title && <h2 className="mt-2 font-display text-3xl sm:text-4xl">{b.title}</h2>}
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
            )}
            <div className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-product">
              {isFile ? (
                <video
                  src={url}
                  poster={cover || undefined}
                  controls
                  autoPlay={autoplay}
                  muted={muted || autoplay}
                  loop={loop}
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={b.title || "Video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
            </div>
            {b.cta_label && b.cta_href && (
              <div className="mt-6 flex justify-center">
                <Button asChild variant="dark"><Link to={b.cta_href}>{b.cta_label} <ArrowRight size={16} /></Link></Button>
              </div>
            )}
          </section>
        );
      }

      case "new_products": {
        const s = (b.settings ?? {}) as Record<string, any>;
        const limit = Math.min(24, Math.max(2, Number(s.limit ?? 8) || 8));
        const cols = Math.min(6, Math.max(2, Number(s.columns ?? 4) || 4));
        const useBadge = s.use_badge !== false;
        let pool = products;
        if (useBadge) {
          const news = products.filter((p) => (p.badge ?? "").toLowerCase() === "new");
          const rest = products.filter((p) => (p.badge ?? "").toLowerCase() !== "new");
          pool = [...news, ...rest];
        }
        const items = pool.slice(0, limit).map(toCardProduct);
        if (!items.length) return null;
        const colsClass: Record<number, string> = {
          2: "grid-cols-2",
          3: "grid-cols-2 md:grid-cols-3",
          4: "grid-cols-2 md:grid-cols-4",
          5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
          6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
        };
        return (
          <section key={b.id} className="container-x py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                {b.eyebrow && <span className="text-xs font-bold tracking-wide text-accent">{b.eyebrow}</span>}
                <h2 className="mt-1 font-display text-3xl sm:text-4xl">{b.title || "Productos nuevos"}</h2>
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
              {b.cta_label && b.cta_href && (
                <Link to={b.cta_href} className="hidden text-sm font-semibold tracking-wide hover:text-accent sm:inline-flex sm:items-center sm:gap-1">
                  {b.cta_label} <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <div className={`mt-8 grid gap-4 ${colsClass[cols]}`}>
              {items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Layout>
      <SeoFromMeta entityType="page" entityId="home" path="/" fallbackTitle="Nutribatidos · Superalimentos andinos y medicina natural" fallbackDescription="Maca, cañihua, espirulina y fórmulas naturales peruanas para el bienestar diario." />
      {blocks.map(renderBlock)}
      <div className="container py-8">
        <ComboRecommendations
          location="home"
          title="Combos recomendados"
          subtitle="Ahorra comprando productos que combinan bien."
        />
      </div>
      <InstagramTestimonials />
    </Layout>
  );
};

export default Home;

