import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShoppingCart, MessageCircle, Heart, Truck, ShieldCheck, Award, Minus, Plus, Check, Repeat } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/Stars";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import type { Product } from "@/data/catalog";
import { useCart } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  category: string | null;
  main_image: string | null;
  gallery_images: any;
  badge: string | null;
  flavor: string | null;
  size: string | null;
  usage_instructions: string | null;
  ingredients: string | null;
  nutrition_facts: any;
  faqs: any;
  subscription_enabled: boolean;
  subscription_discount_percent: number;
  subscription_intervals: number[] | null;
  size_variants: any;
};

const labelFromBadge = (badge: string | null): Product["label"] | undefined => {
  const v = (badge ?? "").toLowerCase();
  if (v === "best seller" || v === "best-seller") return "Best Seller";
  if (v === "new") return "New";
  if (v === "offer" || v === "sale") return "Offer";
  return undefined;
};

const toCardProduct = (p: DbProduct): Product => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  shortBenefit: p.short_description ?? "",
  price: Number(p.sale_price ?? p.price),
  oldPrice: p.sale_price ? Number(p.price) : undefined,
  rating: 4.8,
  reviews: 0,
  label: labelFromBadge(p.badge),
  image: resolveProductImage(p.main_image),
  category: p.category ?? "",
  goal: [],
  brand: "VOLTRA",
});

const parseList = (val: any): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    try {
      const j = JSON.parse(val);
      if (Array.isArray(j)) return j.filter(Boolean).map(String);
    } catch {}
    return val.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const ProductDetail = () => {
  const { slug } = useParams();
  const { add, toggleWish, wishlist } = useCart();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dbp, setDbp] = useState<DbProduct | null>(null);
  const [related, setRelated] = useState<DbProduct[]>([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<"one_time" | "subscription">("one_time");
  const [interval, setIntervalDays] = useState<number>(30);
  const [selectedVariant, setSelectedVariant] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug as string)
        .eq("is_active", true)
        .maybeSingle();
      if (!alive) return;
      setDbp(data as DbProduct | null);
      if (data) {
        const intervals = (data as any).subscription_intervals as number[] | null;
        if (intervals && intervals.length) setIntervalDays(intervals[0]);
        const { data: rel } = await supabase
          .from("products")
          .select("id,slug,name,short_description,price,sale_price,category,main_image,badge")
          .eq("is_active", true)
          .neq("id", (data as any).id)
          .limit(4);
        if (alive) setRelated((rel as DbProduct[]) ?? []);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="container-x py-20 text-center text-muted-foreground">Cargando…</div>
      </Layout>
    );
  }

  if (!dbp) {
    return (
      <Layout>
        <div className="container-x py-20 text-center">
          <h1 className="font-display text-3xl uppercase">Producto no encontrado</h1>
          <p className="mt-2 text-muted-foreground">El producto que buscas ya no está disponible.</p>
          <Button asChild variant="accent" className="mt-6"><Link to="/">Volver al inicio</Link></Button>
        </div>
      </Layout>
    );
  }

  const product = toCardProduct(dbp);
  const mainImg = resolveProductImage(dbp.main_image);
  const galleryUrls = parseList(dbp.gallery_images).map((u) => resolveProductImage(u));
  const gallery = [mainImg, ...galleryUrls].filter(Boolean);
  const subIntervals = (dbp.subscription_intervals && dbp.subscription_intervals.length ? dbp.subscription_intervals : [30, 60, 90]);
  const subDiscount = Number(dbp.subscription_discount_percent ?? 10);
  const subEnabled = !!dbp.subscription_enabled;
  const variants: { label: string; price: number }[] = Array.isArray(dbp.size_variants)
    ? (dbp.size_variants as any[])
        .map((v) => ({ label: String(v?.label ?? ""), price: Number(v?.price ?? 0) }))
        .filter((v) => v.label && v.price > 0)
    : [];
  const variant = variants[selectedVariant];
  const basePrice = variant ? variant.price : Number(dbp.sale_price ?? dbp.price);
  const effectivePrice = purchaseMode === "subscription"
    ? +(basePrice * (1 - subDiscount / 100)).toFixed(2)
    : basePrice;
  const wished = wishlist.includes(dbp.id);

  const faqs: { q: string; a: string }[] = Array.isArray(dbp.faqs)
    ? (dbp.faqs as any[]).map((f) => ({ q: String(f?.q ?? f?.question ?? ""), a: String(f?.a ?? f?.answer ?? "") })).filter((f) => f.q || f.a)
    : [];

  const nutrition: [string, string][] = (() => {
    const n = dbp.nutrition_facts;
    if (!n) return [];
    if (Array.isArray(n)) return n.map((r: any) => [String(r?.label ?? r?.key ?? ""), String(r?.value ?? "")]) as [string, string][];
    if (typeof n === "object") return Object.entries(n).map(([k, v]) => [k, String(v)]) as [string, string][];
    return [];
  })();

  return (
    <Layout>
      <div className="container-x py-6">
        <nav className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link to="/" className="hover:text-accent">Inicio</Link>
          {product.category && (<>
            {" / "}
            <Link to={`/categoria/${product.category.toLowerCase()}`} className="hover:text-accent">{product.category}</Link>
          </>)}
          {" / "}<span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      <section className="container-x grid gap-10 pb-12 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg bg-secondary aspect-square">
            <img src={gallery[activeImg] ?? mainImg} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn("overflow-hidden rounded-md border-2 bg-secondary aspect-square", activeImg === i ? "border-accent" : "border-transparent")}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.label && <Badge className="bg-accent text-accent-foreground uppercase">{product.label === "Best Seller" ? "Más vendido" : product.label === "New" ? "Nuevo" : product.label === "Offer" ? "Oferta" : product.label}</Badge>}
            {dbp.category && <span className="text-xs uppercase tracking-wider text-muted-foreground">{dbp.category}</span>}
          </div>
          <h1 className="mt-3 font-display text-4xl uppercase leading-tight sm:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <Stars rating={product.rating} size={16} />
            <span className="text-sm font-semibold">{product.rating}</span>
          </div>
          {dbp.short_description && <p className="mt-4 text-muted-foreground">{dbp.short_description}</p>}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl">{format(effectivePrice)}</span>
            {purchaseMode === "subscription" && (
              <>
                <span className="text-lg text-muted-foreground line-through">{format(basePrice)}</span>
                <Badge className="bg-accent text-accent-foreground">−{subDiscount}%</Badge>
              </>
            )}
            {purchaseMode === "one_time" && product.oldPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{format(product.oldPrice)}</span>
                <Badge className="bg-destructive text-destructive-foreground">Ahorra {format(product.oldPrice - basePrice)}</Badge>
              </>
            )}
          </div>

          {subEnabled && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-bold uppercase tracking-wider">Compra</p>
              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-smooth",
                purchaseMode === "one_time" ? "border-accent bg-accent/10" : "border-border hover:border-foreground",
              )}>
                <input type="radio" name="purchase" className="mt-1" checked={purchaseMode === "one_time"} onChange={() => setPurchaseMode("one_time")} />
                <div className="flex-1">
                  <p className="font-semibold">Compra única</p>
                  <p className="text-xs text-muted-foreground">{format(basePrice)}</p>
                </div>
              </label>
              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-smooth",
                purchaseMode === "subscription" ? "border-accent bg-accent/10" : "border-border hover:border-foreground",
              )}>
                <input type="radio" name="purchase" className="mt-1" checked={purchaseMode === "subscription"} onChange={() => setPurchaseMode("subscription")} />
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-2">
                    <Repeat size={14} className="text-accent" /> Suscríbete y ahorra {subDiscount}%
                  </p>
                  <p className="text-xs text-muted-foreground">{format(effectivePrice)} · cancela cuando quieras</p>
                  {purchaseMode === "subscription" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {subIntervals.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setIntervalDays(d)}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-smooth",
                            interval === d ? "border-accent bg-background" : "border-border hover:border-foreground",
                          )}
                        >
                          Cada {d} días
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-stretch gap-3">
            <div className="flex items-center rounded-md border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-10 place-items-center hover:bg-secondary"><Minus size={14} /></button>
              <span className="w-10 text-center font-display text-lg">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="grid h-12 w-10 place-items-center hover:bg-secondary"><Plus size={14} /></button>
            </div>
            <Button size="lg" variant="accent" className="flex-1" onClick={() => add(product, {
              quantity: qty,
              subscription: purchaseMode === "subscription" ? { intervalDays: interval, discountPercent: subDiscount } : undefined,
            })}>
              <ShoppingCart /> {purchaseMode === "subscription" ? `Suscribirme · ${format(effectivePrice)}` : "Añadir al carrito"}
            </Button>
            <Button size="lg" variant="outline" onClick={() => toggleWish(dbp.id)} aria-label="Favoritos">
              <Heart className={wished ? "fill-accent text-accent" : ""} />
            </Button>
          </div>
          {(() => {
            const lines = [
              `¡Hola! Estoy interesado en ${product.name}`,
              `Cantidad: ${qty}`,
              purchaseMode === "subscription"
                ? `Tipo de compra: suscripción (cada ${interval} días, -${subDiscount}% de descuento)`
                : `Tipo de compra: única`,
              `Precio unitario: ${format(effectivePrice)}`,
              `Total: ${format(effectivePrice * qty)}`,
            ].filter(Boolean).join("\n");
            return (
              <Button asChild size="lg" variant="dark" className="mt-3 w-full">
                <a href={`https://wa.me/14155552671?text=${encodeURIComponent(lines)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Comprar por WhatsApp
                </a>
              </Button>
            );
          })()}

          <ul className="mt-6 grid gap-2 rounded-lg border bg-secondary/40 p-4 text-sm">
            <li className="flex items-center gap-2"><Truck size={16} className="text-accent" /> Envío gratis sobre {format(50)} · entrega 1–3 días</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> Garantía de devolución de 30 días</li>
            <li className="flex items-center gap-2"><Award size={16} className="text-accent" /> Probado en laboratorio · Certificado GMP</li>
          </ul>
        </div>
      </section>

      {(dbp.description || dbp.usage_instructions || dbp.ingredients || nutrition.length > 0) && (
        <section className="container-x pb-16">
          <Tabs defaultValue={dbp.description ? "description" : dbp.usage_instructions ? "use" : dbp.ingredients ? "ingredients" : "nutrition"}>
            <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
              {dbp.description && (
                <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Descripción</TabsTrigger>
              )}
              {dbp.usage_instructions && (
                <TabsTrigger value="use" className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Cómo usar</TabsTrigger>
              )}
              {dbp.ingredients && (
                <TabsTrigger value="ingredients" className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Ingredientes</TabsTrigger>
              )}
              {nutrition.length > 0 && (
                <TabsTrigger value="nutrition" className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Información nutricional</TabsTrigger>
              )}
            </TabsList>
            {dbp.description && (
              <TabsContent value="description" className="mt-6 max-w-3xl whitespace-pre-line text-muted-foreground leading-relaxed">
                {dbp.description}
              </TabsContent>
            )}
            {dbp.usage_instructions && (
              <TabsContent value="use" className="mt-6 max-w-3xl whitespace-pre-line text-muted-foreground">
                {dbp.usage_instructions}
              </TabsContent>
            )}
            {dbp.ingredients && (
              <TabsContent value="ingredients" className="mt-6 max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
                {dbp.ingredients}
              </TabsContent>
            )}
            {nutrition.length > 0 && (
              <TabsContent value="nutrition" className="mt-6">
                <div className="max-w-md overflow-hidden rounded-lg border">
                  <div className="bg-foreground px-4 py-2 text-sm font-bold uppercase tracking-wider text-background">Información nutricional</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {nutrition.map(([k, v]) => (
                        <tr key={k} className="border-t"><td className="px-4 py-2 text-muted-foreground">{k}</td><td className="px-4 py-2 text-right font-semibold">{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="container-x pb-16">
          <h2 className="font-display text-3xl uppercase">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="mt-4 max-w-3xl">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-line">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {related.length > 0 && (
        <section className="container-x pb-20">
          <h2 className="font-display text-3xl uppercase">También te puede gustar</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={toCardProduct(p)} />)}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default ProductDetail;
