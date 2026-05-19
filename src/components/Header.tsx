import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, MessageCircle, Heart, X, LogOut, Package, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCart, cartTotals } from "@/store/cart";
import { categories } from "@/data/catalog";
import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/context/CurrencyContext";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { id: string; label: string; href: string; open_in_new_tab: boolean };

const Logo = ({ className }: { className?: string }) => {
  const { content } = useSiteContent(["logo_text", "logo_accent", "logo_image_url"], {
    logo_text: "VOLT", logo_accent: "RA", logo_image_url: "",
  });
  if (content.logo_image_url) {
    return <img src={content.logo_image_url} alt="Logo" className={cn("h-8 w-auto object-contain lg:h-10", className)} />;
  }
  return (
    <span className={cn("font-display text-2xl tracking-tight lg:text-3xl", className)}>
      {content.logo_text}<span className="text-accent">{content.logo_accent}</span>
    </span>
  );
};

const CurrencySwitcher = () => {
  const { currency, setCurrency } = useCurrency();
  const meta = CURRENCIES[currency];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide" aria-label="Currency">
          <span>{meta.flag}</span> {currency}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
          <DropdownMenuItem key={code} onClick={() => setCurrency(code)} className={cn(code === currency && "bg-secondary")}>
            <span className="mr-1">{CURRENCIES[code].flag}</span>
            <span className="font-semibold">{code}</span>
            <span className="text-muted-foreground text-xs ml-auto">{CURRENCIES[code].symbol}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserMenu = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!user) {
    return (
      <Button variant="ghost" size="icon" aria-label="Account" onClick={() => navigate("/auth")}>
        <User />
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <UserCircle />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/my-profile")}><UserCircle size={14}/> My profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/my-orders")}><Package size={14}/> My orders</DropdownMenuItem>
        {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><Package size={14}/> Admin panel</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}><LogOut size={14}/> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
          <CurrencySwitcher />
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
