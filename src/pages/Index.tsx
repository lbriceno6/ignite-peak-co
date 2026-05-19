import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Truck, ShieldCheck, Award, MessageCircle } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ProductCard } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { goals as fallbackGoals, reviews, type Product } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/useSiteContent";
import { resolveProductImage } from "@/lib/productImage";
import { useCurrency } from "@/context/CurrencyContext";
import heroImage from "@/assets/hero.jpg";
import promoImage from "@/assets/promo-banner.jpg";
import productPlaceholder from "@/assets/product-protein.jpg";

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
};

type GoalCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
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
    brand: "VOLTRA",
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
  const { format } = useCurrency();
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
    "home.guides.eyebrow": "Knowledge",
    "home.guides.title": "Guides & insights",
    "home.guides.subtitle": "",
    "home.guides.cta_label": "All articles",
    "home.guides.cta_href": "/blog",
  });

  const loadAll = async () => {
    const [p, c, featured, recent, hero, blk, gc] = await Promise.all([
      supabase.from("products").select("id,slug,name,short_description,price,sale_price,category,main_image,badge").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("name,slug,icon,sort_order").eq("type", "product").order("sort_order").order("name"),
      supabase.from("blog_posts").select("id,slug,title,excerpt,category,read_time,cover_image,published_at,is_featured,featured_order").eq("is_published", true).eq("is_featured", true).order("featured_order", { ascending: true, nullsFirst: false }).order("published_at", { ascending: false }).limit(3),
      supabase.from("blog_posts").select("id,slug,title,excerpt,category,read_time,cover_image,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
      supabase.from("hero_slides").select("id,eyebrow,title,subtitle,image_url,primary_label,primary_href,secondary_label,secondary_href").eq("is_active", true).order("sort_order").order("created_at"),
      supabase.from("home_blocks").select("*").eq("is_active", true).order("sort_order"),
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

  const renderBlock = (b: HomeBlock) => {
    switch (b.block_type) {
      case "hero": {
        const displaySlides: HeroSlide[] = slides.length
          ? slides
          : [{
              id: "fallback",
              eyebrow: "Engineered for performance",
              title: "Take your performance to the next level",
              subtitle: "Premium nutrition, supplements and healthy products designed to support your energy, strength, recovery and wellness.",
              image_url: null,
              primary_label: "Shop now",
              primary_href: "/category/protein",
              secondary_label: "View best sellers",
              secondary_href: "/category/best-sellers",
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
                            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                              <Zap size={12} /> {s.eyebrow}
                            </span>
                          )}
                          <h1 className="mt-6 font-display text-5xl uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
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
                            <span>Trusted by 240k+ athletes worldwide</span>
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
                      aria-label={`Go to slide ${i + 1}`}
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
                <h2 className="font-display text-3xl uppercase sm:text-4xl">{b.title || "Shop by category"}</h2>
                {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/category/${c.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-5 text-center transition-smooth hover:border-accent hover:shadow-product hover:-translate-y-1"
                >
                  <span className="text-3xl">{c.icon || "🏷️"}</span>
                  <span className="text-sm font-bold uppercase tracking-wide group-hover:text-accent">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        );

      case "best_sellers":
        if (!bestSellersDisplay.length) return null;
        return (
          <section key={b.id} className="bg-secondary/40 py-16">
            <div className="container-x">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {b.eyebrow && <span className="text-xs font-bold uppercase tracking-wider text-accent">{b.eyebrow}</span>}
                  <h2 className="mt-1 font-display text-3xl uppercase sm:text-4xl">{b.title || "Best sellers"}</h2>
                </div>
                {b.cta_label && b.cta_href && (
                  <Link to={b.cta_href} className="hidden text-sm font-semibold uppercase tracking-wider hover:text-accent sm:inline-flex sm:items-center sm:gap-1">
                    {b.cta_label} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {bestSellersDisplay.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        );

      case "goals":
        return (
          <section key={b.id} className="container-x py-16">
            <div className="text-center">
              {b.eyebrow && <span className="text-xs font-bold uppercase tracking-wider text-accent">{b.eyebrow}</span>}
              <h2 className="mt-1 font-display text-3xl uppercase sm:text-4xl">{b.title || "Shop by goal"}</h2>
              {b.subtitle && <p className="mt-2 text-muted-foreground">{b.subtitle}</p>}
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {goals.map((g, i) => (
                <Link
                  key={g.slug}
                  to={`/category/goal-${g.slug}`}
                  className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-lg bg-surface-darker p-5 text-background transition-smooth hover:shadow-elevated"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent opacity-0 transition-smooth group-hover:opacity-100" />
                  <span className="font-display text-6xl text-background/10">0{i + 1}</span>
                  <div className="relative">
                    <h3 className="font-display text-xl uppercase">{g.name}</h3>
                    <p className="mt-1 text-xs text-background/60">{g.desc}</p>
                    <ArrowRight size={16} className="mt-3 text-accent opacity-0 transition-smooth group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "promo":
        return (
          <section key={b.id} className="container-x">
            <div className="relative overflow-hidden rounded-2xl bg-surface-darker text-background">
              <img
                src={b.image_url || promoImage}
                alt={b.title || "Promotional offer"}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-darker via-surface-darker/70 to-transparent" />
              <div className="relative grid min-h-[340px] items-center p-8 sm:p-12 lg:p-16">
                <div className="max-w-lg">
                  {b.eyebrow && (
                    <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                      {b.eyebrow}
                    </span>
                  )}
                  <h3 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">
                    {b.title || "Stack up. Save up to 30%."}
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
              {b.eyebrow && <span className="text-xs font-bold uppercase tracking-wider text-accent">{b.eyebrow}</span>}
              <h2 className="mt-1 font-display text-3xl uppercase sm:text-4xl">{b.title || "More to fuel your training"}</h2>
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
                <h2 className="mt-3 font-display text-3xl uppercase sm:text-4xl">{b.title || "Loved by athletes"}</h2>
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
                      {r.verified && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">Verified buyer</span>}
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
                <span className="text-xs font-bold uppercase tracking-wider text-accent">{b.eyebrow || content["home.guides.eyebrow"]}</span>
                <h2 className="mt-1 font-display text-3xl uppercase sm:text-4xl">{b.title || content["home.guides.title"]}</h2>
                {(b.subtitle || content["home.guides.subtitle"]) && (
                  <p className="mt-2 max-w-xl text-muted-foreground">{b.subtitle || content["home.guides.subtitle"]}</p>
                )}
              </div>
              <Link to={b.cta_href || content["home.guides.cta_href"] || "/blog"} className="hidden text-sm font-semibold uppercase tracking-wider hover:text-accent sm:inline-flex sm:items-center sm:gap-1">
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
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {post.category && <span className="text-accent font-bold">{post.category}</span>}
                    {post.read_time && <span>· {post.read_time} read</span>}
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
                { icon: Truck, title: "Free shipping", desc: `On orders over ${format(50)}` },
                { icon: ShieldCheck, title: "Secure payment", desc: "100% encrypted checkout" },
                { icon: Award, title: "Lab tested", desc: "Third-party verified quality" },
                { icon: MessageCircle, title: "Real support", desc: "WhatsApp 7 days a week" },
              ].map((t) => (
                <div key={t.title} className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <t.icon size={22} />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wide">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return <Layout>{blocks.map(renderBlock)}</Layout>;
};

export default Home;
