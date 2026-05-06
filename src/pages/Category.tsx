import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { products, categories, goals } from "@/data/catalog";

const filterGroups = [
  { key: "type", title: "Product type", options: ["Protein", "Creatine", "Pre-Workout", "Vitamins", "Snacks", "Accessories", "Amino Acids"] },
  { key: "goal", title: "Goal", options: goals.map((g) => g.name) },
  { key: "flavor", title: "Flavor", options: ["Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Tropical Storm", "Lemon Ice", "Berry Blast"] },
  { key: "size", title: "Size", options: ["300g", "500g", "750g", "900g", "1kg", "2kg", "4kg"] },
  { key: "rating", title: "Rating", options: ["4★ & up", "4.5★ & up", "4.8★ & up"] },
  { key: "brand", title: "Brand", options: ["VOLTRA"] },
];

const Filters = () => (
  <div className="space-y-4">
    <div>
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wider">Price (€)</h4>
      <Slider defaultValue={[0, 60]} min={0} max={100} step={1} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>€0</span><span>€100</span>
      </div>
    </div>
    <Accordion type="multiple" defaultValue={["type", "goal"]}>
      {filterGroups.map((g) => (
        <AccordionItem key={g.key} value={g.key}>
          <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">{g.title}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2.5">
              {g.options.map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox /> <span>{o}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

const Category = () => {
  const { slug = "" } = useParams();
  const [sort, setSort] = useState("popular");

  const title = useMemo(() => {
    if (slug.startsWith("goal-")) {
      const g = goals.find((x) => x.slug === slug.replace("goal-", ""));
      return g?.name ?? "Goal";
    }
    const c = categories.find((x) => x.slug === slug);
    return c?.name ?? "All products";
  }, [slug]);

  const filtered = useMemo(() => {
    if (slug.startsWith("goal-")) {
      const goal = slug.replace("goal-", "");
      return products.filter((p) => p.goal.includes(goal));
    }
    const c = categories.find((x) => x.slug === slug);
    if (!c) return products;
    return products.filter((p) => p.category.toLowerCase().includes(c.name.toLowerCase().split(" ")[0].toLowerCase()));
  }, [slug]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "price-low") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    return arr;
  }, [filtered, sort]);

  return (
    <Layout>
      <div className="bg-secondary/40 py-10">
        <div className="container-x">
          <nav className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-accent">Home</Link> / <span className="text-foreground">{title}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{sorted.length} products</p>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <h3 className="mb-4 font-display text-xl uppercase">Filters</h3>
          <Filters />
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal size={16} /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-6"><Filters /></div>
              </SheetContent>
            </Sheet>

            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-md border border-border bg-background py-2 pl-3 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="popular">Most popular</option>
                  <option value="rating">Highest rated</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {sorted.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Category;
