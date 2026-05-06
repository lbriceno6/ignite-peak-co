import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, MessageCircle, Heart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart, cartTotals } from "@/store/cart";
import { categories } from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { items, setOpen, wishlist } = useCart();
  const { count } = cartTotals(items);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-x flex h-16 items-center gap-4 lg:h-20">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <Link to="/" className="font-display text-2xl">
              VOLT<span className="text-accent">RA</span>
            </Link>
            <nav className="mt-8 flex flex-col gap-1">
              {categories.map((c) => (
                <Link key={c.slug} to={`/category/${c.slug}`} className="rounded-md px-3 py-2.5 hover:bg-secondary font-medium">
                  <span className="mr-2">{c.icon}</span> {c.name}
                </Link>
              ))}
              <hr className="my-3" />
              <Link to="/about" className="rounded-md px-3 py-2.5 hover:bg-secondary">About us</Link>
              <Link to="/blog" className="rounded-md px-3 py-2.5 hover:bg-secondary">Guides</Link>
              <Link to="/contact" className="rounded-md px-3 py-2.5 hover:bg-secondary">Contact</Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="font-display text-2xl tracking-tight lg:text-3xl">
          VOLT<span className="text-accent">RA</span>
        </Link>

        <div className="ml-6 hidden flex-1 lg:block">
          <form onSubmit={submitSearch} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search proteins, creatine, vitamins..."
              className="h-11 pl-10 bg-secondary border-transparent focus-visible:bg-background"
            />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen((s) => !s)} aria-label="Search">
            {searchOpen ? <X /> : <Search />}
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="WhatsApp">
            <a href="https://wa.me/14155552671" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="text-success" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex relative" aria-label="Wishlist" asChild>
            <Link to="/wishlist">
              <Heart />
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {wishlist.length}
                </span>
              )}
            </Link>
          </Button>
          <UserMenu />
          <Button variant="ghost" size="icon" className="relative" aria-label="Cart" onClick={() => setOpen(true)}>
            <ShoppingBag />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border p-3 lg:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="h-11 pl-10 bg-secondary"
              autoFocus
            />
          </form>
        </div>
      )}

      <nav className="hidden border-t border-border lg:block">
        <div className="container-x flex items-center gap-1 overflow-x-auto">
          {categories.map((c) => (
            <NavLink
              key={c.slug}
              to={`/category/${c.slug}`}
              className={({ isActive }) =>
                cn(
                  "px-4 py-3 text-sm font-medium uppercase tracking-wide whitespace-nowrap border-b-2 transition-smooth",
                  isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {c.name}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <NavLink to="/blog" className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Guides</NavLink>
            <NavLink to="/about" className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">About</NavLink>
            <NavLink to="/contact" className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Contact</NavLink>
          </div>
        </div>
      </nav>
    </header>
  );
};
