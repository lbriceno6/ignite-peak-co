import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart, MessageCircle, Heart, Truck, ShieldCheck, Award, Minus, Plus, Check } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/Stars";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { products } from "@/data/catalog";
import { useCart } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

const ProductDetail = () => {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug) ?? products[0];
  const { add, toggleWish, wishlist } = useCart();
  const { format } = useCurrency();
  const [flavor, setFlavor] = useState(product.flavors?.[0]);
  const [size, setSize] = useState(product.sizes?.[0]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const gallery = [product.image, product.image, product.image, product.image];
  const related = products.filter((p) => p.id !== product.id).slice(0, 4);
  const wished = wishlist.includes(product.id);

  return (
    <Layout>
      <div className="container-x py-6">
        <nav className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link to="/" className="hover:text-accent">Home</Link> /{" "}
          <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-accent">{product.category}</Link> /{" "}
          <span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      <section className="container-x grid gap-10 pb-12 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg bg-secondary aspect-square">
            <img src={gallery[activeImg]} alt={product.name} className="h-full w-full object-cover" />
          </div>
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
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.label && <Badge className="bg-accent text-accent-foreground uppercase">{product.label}</Badge>}
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{product.brand} · {product.category}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl uppercase leading-tight sm:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <Stars rating={product.rating} size={16} />
            <span className="text-sm font-semibold">{product.rating}</span>
            <a href="#reviews" className="text-sm text-muted-foreground hover:text-accent">({product.reviews} reviews)</a>
          </div>
          <p className="mt-4 text-muted-foreground">{product.shortBenefit}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl">€{product.price.toFixed(2)}</span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">€{product.oldPrice.toFixed(2)}</span>
                <Badge className="bg-destructive text-destructive-foreground">Save €{(product.oldPrice - product.price).toFixed(2)}</Badge>
              </>
            )}
          </div>

          {product.flavors && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider">Flavor: <span className="text-muted-foreground font-normal normal-case">{flavor}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.flavors.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFlavor(f)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-smooth",
                      flavor === f ? "border-accent bg-accent/10 text-foreground" : "border-border hover:border-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider">Size: <span className="text-muted-foreground font-normal normal-case">{size}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-smooth",
                      size === s ? "border-accent bg-accent/10" : "border-border hover:border-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-stretch gap-3">
            <div className="flex items-center rounded-md border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-10 place-items-center hover:bg-secondary"><Minus size={14} /></button>
              <span className="w-10 text-center font-display text-lg">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="grid h-12 w-10 place-items-center hover:bg-secondary"><Plus size={14} /></button>
            </div>
            <Button size="lg" variant="accent" className="flex-1" onClick={() => add(product, { flavor, size, quantity: qty })}>
              <ShoppingCart /> Add to cart
            </Button>
            <Button size="lg" variant="outline" onClick={() => toggleWish(product.id)} aria-label="Wishlist">
              <Heart className={wished ? "fill-accent text-accent" : ""} />
            </Button>
          </div>
          <Button asChild size="lg" variant="dark" className="mt-3 w-full">
            <a href={`https://wa.me/14155552671?text=Hi!%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Buy by WhatsApp
            </a>
          </Button>

          <ul className="mt-6 grid gap-2 rounded-lg border bg-secondary/40 p-4 text-sm">
            <li className="flex items-center gap-2"><Truck size={16} className="text-accent" /> Free shipping over €50 · delivery 1–3 days</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> 30-day money-back guarantee</li>
            <li className="flex items-center gap-2"><Award size={16} className="text-accent" /> Lab-tested · GMP certified</li>
          </ul>
        </div>
      </section>

      {/* TABS */}
      <section className="container-x pb-16">
        <Tabs defaultValue="benefits">
          <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
            {["benefits", "description", "use", "ingredients", "nutrition"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-bold uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {t === "use" ? "How to use" : t === "nutrition" ? "Nutrition facts" : t}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="benefits" className="mt-6 grid gap-3 md:grid-cols-2">
            {["Builds and preserves lean muscle mass", "Supports faster recovery between sessions", "Ultra-fast absorption (under 30 min)", "Low in fat & sugars", "Mixes instantly — no clumps", "Independently lab tested"].map((b) => (
              <div key={b} className="flex items-start gap-2 rounded-md bg-secondary/40 p-3 text-sm">
                <Check className="mt-0.5 text-accent shrink-0" size={16} /> {b}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="description" className="mt-6 max-w-3xl text-muted-foreground leading-relaxed">
            <p>{product.name} delivers a premium-grade formulation engineered for athletes who refuse to compromise on quality. Each serving is precision-dosed with clinically supported ingredients, sourced from trusted manufacturers and tested by independent labs for purity and potency.</p>
            <p className="mt-3">Whether you train for performance, body composition or longevity, this product slots seamlessly into your daily routine — no fillers, no artificial colors, no shortcuts.</p>
          </TabsContent>
          <TabsContent value="use" className="mt-6 max-w-3xl text-muted-foreground">
            Mix 1 scoop (30g) with 250–300ml of water or your favorite plant-based drink. Consume immediately after training or as a high-protein snack between meals. Can be combined with creatine and BCAAs.
          </TabsContent>
          <TabsContent value="ingredients" className="mt-6 max-w-3xl text-sm text-muted-foreground">
            Whey protein isolate (90%), cocoa powder, natural flavoring, emulsifier (sunflower lecithin), thickener (xanthan gum), sweetener (sucralose), salt. <span className="block mt-2 text-xs">Allergens: milk. May contain traces of soy, egg, gluten.</span>
          </TabsContent>
          <TabsContent value="nutrition" className="mt-6">
            <div className="max-w-md overflow-hidden rounded-lg border">
              <div className="bg-foreground px-4 py-2 text-sm font-bold uppercase tracking-wider text-background">Per 30g serving</div>
              <table className="w-full text-sm">
                <tbody>
                  {[["Energy", "118 kcal"], ["Protein", "27 g"], ["Carbohydrates", "1.5 g"], ["of which sugars", "0.8 g"], ["Fat", "0.5 g"], ["of which saturates", "0.2 g"], ["Salt", "0.1 g"], ["BCAAs", "5.6 g"]].map(([k, v]) => (
                    <tr key={k} className="border-t"><td className="px-4 py-2 text-muted-foreground">{k}</td><td className="px-4 py-2 text-right font-semibold">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* FAQ */}
      <section className="container-x pb-16">
        <h2 className="font-display text-3xl uppercase">FAQ</h2>
        <Accordion type="single" collapsible className="mt-4 max-w-3xl">
          {[
            { q: "When should I take this product?", a: "Within 30 minutes after your workout for optimal recovery, or any time of day as a high-protein snack." },
            { q: "Is it safe for daily use?", a: "Yes. All our products are formulated with safe, clinically researched dosages and are third-party tested." },
            { q: "Can I combine it with creatine?", a: "Absolutely. Many of our customers stack this with creatine and a pre-workout for the best results." },
            { q: "What is your return policy?", a: "We offer a 30-day money-back guarantee, even on opened tubs." },
          ].map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* RELATED */}
      <section className="container-x pb-20">
        <h2 className="font-display text-3xl uppercase">You may also like</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
