import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, MessageCircle, Heart, X, LogOut, Package, UserCircle, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCart, cartTotals } from "@/store/cart";

import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/context/CurrencyContext";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { applyMode, getStoredMode, setStoredMode, type Mode } from "@/lib/theme";

type CategoryItem = { id: string; slug: string; name: string; icon: string | null; parent_id: string | null };
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const ModeSwitcher = () => {
  const [mode, setMode] = useState<Mode>(() => getStoredMode());
  const pick = (m: Mode) => { setMode(m); setStoredMode(m); applyMode(m); };
  const Icon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema claro u oscuro">
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => pick("light")} className={cn(mode === "light" && "bg-secondary")}><Sun size={14}/> Claro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("dark")} className={cn(mode === "dark" && "bg-secondary")}><Moon size={14}/> Oscuro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("system")} className={cn(mode === "system" && "bg-secondary")}><Monitor size={14}/> Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type NavItem = { id: string; label: string; href: string; open_in_new_tab: boolean };

const Logo = ({ className }: { className?: string }) => {
  const { content, loading } = useSiteContent(["logo_text", "logo_accent", "logo_image_url"], {
    logo_text: "", logo_accent: "", logo_image_url: "",
  });
  if (loading) {
    return <span className={cn("inline-block h-8 w-24 lg:h-10", className)} aria-hidden />;
  }
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
        <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide" aria-label="Moneda">
          <span>{meta.flag}</span> {currency}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Moneda</DropdownMenuLabel>
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
      <Button variant="ghost" size="icon" aria-label="Cuenta" onClick={() => navigate("/auth")}>
        <User />
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cuenta">
          <UserCircle />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/my-profile")}><UserCircle size={14}/> Mi perfil</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/my-orders")}><Package size={14}/> Mis pedidos</DropdownMenuItem>
        {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><Package size={14}/> Panel de administración</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}><LogOut size={14}/> Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Header = () => {
  const { items, setOpen, wishlist } = useCart();
  const { count } = cartTotals(items);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const navigate = useNavigate();

  const { content: menuStyle } = useSiteContent(
    ["nav_menu_max_categories", "nav_menu_font_family", "nav_menu_text_color", "nav_menu_bg_color"],
    { nav_menu_max_categories: "6", nav_menu_font_family: "", nav_menu_text_color: "", nav_menu_bg_color: "" },
  );
  const maxCats = Math.max(1, Math.min(20, parseInt(menuStyle.nav_menu_max_categories || "6", 10) || 6));
  const mains = categories.filter((c) => !c.parent_id);
  const visibleCategories = mains.slice(0, maxCats);
  const subsByParent: Record<string, CategoryItem[]> = {};
  for (const c of categories) {
    if (c.parent_id) (subsByParent[c.parent_id] ||= []).push(c);
  }
  const navStyle: React.CSSProperties = {
    ...(menuStyle.nav_menu_font_family ? { fontFamily: menuStyle.nav_menu_font_family } : {}),
    ...(menuStyle.nav_menu_text_color ? { color: menuStyle.nav_menu_text_color } : {}),
    ...(menuStyle.nav_menu_bg_color ? { backgroundColor: menuStyle.nav_menu_bg_color } : {}),
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [navRes, catRes] = await Promise.all([
        supabase.from("nav_links").select("id,label,href,open_in_new_tab,is_active,sort_order").eq("is_active", true).order("sort_order"),
        supabase.from("categories").select("id,slug,name,icon,parent_id,sort_order").eq("type", "product").eq("is_active", true).order("sort_order").order("name"),
      ]);
      if (!alive) return;
      setNavItems((navRes.data as NavItem[]) ?? []);
      if (catRes.data) setCategories(catRes.data as CategoryItem[]);
    })();
    return () => { alive = false; };
  }, []);


  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  };

  const renderNavLink = (n: NavItem, className: string) => {
    const isExternal = /^https?:\/\//.test(n.href);
    if (isExternal || n.open_in_new_tab) {
      return (
        <a key={n.id} href={n.href} target={n.open_in_new_tab ? "_blank" : undefined} rel="noopener noreferrer" className={className}>
          {n.label}
        </a>
      );
    }
    return <NavLink key={n.id} to={n.href} className={className}>{n.label}</NavLink>;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-x flex h-16 items-center gap-4 lg:h-20">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <Link to="/">
              <Logo className="text-2xl" />
            </Link>
            <nav className="mt-8 flex flex-col gap-1">
              {visibleCategories.map((c) => (
                <Link key={c.slug} to={`/categoria/${c.slug}`} className="rounded-md px-3 py-2.5 hover:bg-secondary font-medium">
                  <span className="mr-2">{c.icon}</span> {c.name}
                </Link>
              ))}
              {navItems.length > 0 && <hr className="my-3" />}
              {navItems.map((n) => renderNavLink(n, "rounded-md px-3 py-2.5 hover:bg-secondary"))}
            </nav>

          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center">
          <Logo />
        </Link>

        <div className="ml-6 hidden flex-1 lg:block">
          <form onSubmit={submitSearch} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar maca, cañihua, espirulina..."
              className="h-11 pl-10 bg-secondary border-transparent focus-visible:bg-background"
            />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen((s) => !s)} aria-label="Buscar">
            {searchOpen ? <X /> : <Search />}
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="WhatsApp">
            <a href="https://wa.me/14155552671" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="text-success" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex relative" aria-label="Favoritos" asChild>
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
          <ModeSwitcher />
          <UserMenu />
          <Button variant="ghost" size="icon" className="relative" aria-label="Carrito" onClick={() => setOpen(true)}>
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
              placeholder="Buscar productos..."
              className="h-11 pl-10 bg-secondary"
              autoFocus
            />
          </form>
        </div>
      )}

      <nav className="hidden border-t border-border lg:block" style={navStyle}>
        <div className="container-x flex items-center gap-1 overflow-x-auto">
          {visibleCategories.map((c) => (
            <NavLink
              key={c.slug}
              to={`/categoria/${c.slug}`}
              style={menuStyle.nav_menu_text_color ? { color: menuStyle.nav_menu_text_color } : undefined}
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
            {navItems.map((n) => renderNavLink(n, "px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"))}
          </div>
        </div>
      </nav>

    </header>
  );
};
