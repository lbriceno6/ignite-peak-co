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

type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  show_in_menu?: boolean;
  menu_show_desktop?: boolean;
  menu_show_mobile?: boolean;
  menu_label?: string | null;
  menu_column?: number;
  menu_group_title?: string | null;
  menu_badge?: string | null;
  menu_badge_bg?: string | null;
  menu_badge_color?: string | null;
  menu_type?: string;
  featured_enabled?: boolean;
  featured_title?: string | null;
  featured_text?: string | null;
  featured_cta_label?: string | null;
  featured_cta_href?: string | null;
  featured_image_url?: string | null;
};

type MenuCustomField = {
  id: string;
  parent_category_id: string | null;
  field_type: string;
  title: string;
  subtitle: string | null;
  href: string | null;
  image_url: string | null;
  cta_label: string | null;
  column_index: number;
  sort_order: number;
  is_active: boolean;
  show_desktop: boolean;
  show_mobile: boolean;
  badge_text: string | null;
  badge_bg: string | null;
  badge_color: string | null;
};
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
  const [customFields, setCustomFields] = useState<MenuCustomField[]>([]);
  const navigate = useNavigate();

  const { content: menuStyle } = useSiteContent(
    [
      "nav_menu_max_categories",
      "nav_menu_font_family",
      "nav_menu_text_color",
      "nav_menu_bg_color",
      "nav_menu_font_weight",
      "nav_menu_font_size_desktop",
      "nav_menu_font_size_mobile",
      "nav_menu_hover_color",
      "nav_menu_text_transform",
      "nav_menu_letter_spacing",
      "nav_menu_item_gap_desktop",
      "nav_menu_item_gap_tablet",
      "nav_menu_item_gap_mobile",
      "nav_menu_underline_active",
    ],
    {
      nav_menu_max_categories: "6",
      nav_menu_font_family: "",
      nav_menu_text_color: "",
      nav_menu_bg_color: "",
      nav_menu_font_weight: "600",
      nav_menu_font_size_desktop: "14",
      nav_menu_font_size_mobile: "15",
      nav_menu_hover_color: "",
      nav_menu_text_transform: "uppercase",
      nav_menu_letter_spacing: "0.03em",
      nav_menu_item_gap_desktop: "32",
      nav_menu_item_gap_tablet: "18",
      nav_menu_item_gap_mobile: "14",
      nav_menu_underline_active: "1",
    },
  );
  const maxCats = Math.max(1, Math.min(20, parseInt(menuStyle.nav_menu_max_categories || "6", 10) || 6));
  const labelOf = (c: CategoryItem) => (c.menu_label && c.menu_label.trim()) || c.name;
  const mainsDesktop = categories
    .filter((c) => !c.parent_id && c.show_in_menu !== false && c.menu_show_desktop !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
  const mainsMobile = categories
    .filter((c) => !c.parent_id && c.show_in_menu !== false && c.menu_show_mobile !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
  const visibleCategoriesDesktop = mainsDesktop.slice(0, maxCats);
  const visibleCategoriesMobile = mainsMobile.slice(0, maxCats);
  const subsByParent: Record<string, CategoryItem[]> = {};
  for (const c of categories) {
    if (c.parent_id && c.show_in_menu !== false) {
      (subsByParent[c.parent_id] ||= []).push(c);
    }
  }
  Object.values(subsByParent).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));

  const fieldsByParent: Record<string, MenuCustomField[]> = {};
  for (const f of customFields) {
    if (!f.is_active || !f.parent_category_id) continue;
    (fieldsByParent[f.parent_category_id] ||= []).push(f);
  }
  Object.values(fieldsByParent).forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));

  // Group subs by column (1..N), then within column by group title
  const groupedSubs = (parentId: string) => {
    const subs = (subsByParent[parentId] || []).filter((s) => s.menu_show_desktop !== false);
    const byCol: Record<number, CategoryItem[]> = {};
    subs.forEach((s) => {
      const col = Math.max(1, Math.min(6, s.menu_column || 1));
      (byCol[col] ||= []).push(s);
    });
    return byCol;
  };

  const fieldsByCol = (parentId: string) => {
    const list = (fieldsByParent[parentId] || []).filter((f) => f.show_desktop);
    const byCol: Record<number, MenuCustomField[]> = {};
    list.forEach((f) => {
      const col = Math.max(1, Math.min(6, f.column_index || 1));
      (byCol[col] ||= []).push(f);
    });
    return byCol;
  };

  const navStyle: React.CSSProperties = {
    ...(menuStyle.nav_menu_font_family ? { fontFamily: menuStyle.nav_menu_font_family } : {}),
    ...(menuStyle.nav_menu_text_color ? { color: menuStyle.nav_menu_text_color } : {}),
    ...(menuStyle.nav_menu_bg_color ? { backgroundColor: menuStyle.nav_menu_bg_color } : {}),
  };

  const fontWeightNum = parseInt(menuStyle.nav_menu_font_weight || "600", 10) || 600;
  const mainLinkStyle: React.CSSProperties = {
    fontWeight: fontWeightNum,
    fontSize: `${parseInt(menuStyle.nav_menu_font_size_desktop || "14", 10) || 14}px`,
    textTransform: (menuStyle.nav_menu_text_transform || "uppercase") as React.CSSProperties["textTransform"],
    letterSpacing: menuStyle.nav_menu_letter_spacing || "0.03em",
    ...(menuStyle.nav_menu_font_family ? { fontFamily: menuStyle.nav_menu_font_family } : {}),
    ...(menuStyle.nav_menu_text_color ? { color: menuStyle.nav_menu_text_color } : {}),
  };
  const mainMobileLinkStyle: React.CSSProperties = {
    fontWeight: fontWeightNum,
    fontSize: `${parseInt(menuStyle.nav_menu_font_size_mobile || "15", 10) || 15}px`,
    textTransform: (menuStyle.nav_menu_text_transform || "uppercase") as React.CSSProperties["textTransform"],
    letterSpacing: menuStyle.nav_menu_letter_spacing || "0.03em",
    ...(menuStyle.nav_menu_font_family ? { fontFamily: menuStyle.nav_menu_font_family } : {}),
    ...(menuStyle.nav_menu_text_color ? { color: menuStyle.nav_menu_text_color } : {}),
  };
  const hoverColor = menuStyle.nav_menu_hover_color || "";
  const gapDesktop = parseInt(menuStyle.nav_menu_item_gap_desktop || "32", 10) || 32;
  const gapTablet = parseInt(menuStyle.nav_menu_item_gap_tablet || "18", 10) || 18;
  const gapMobile = parseInt(menuStyle.nav_menu_item_gap_mobile || "14", 10) || 14;
  const showUnderline = (menuStyle.nav_menu_underline_active ?? "1") !== "0";

  const navCss = `
    [data-nav-main] a.nav-main-link:hover { ${hoverColor ? `color: ${hoverColor} !important;` : ""} }
    [data-nav-mobile] .nav-mobile-link:hover, [data-nav-mobile] .nav-mobile-link:hover > span { ${hoverColor ? `color: ${hoverColor} !important;` : ""} }
    [data-nav-main] .nav-main-list { column-gap: ${gapDesktop}px; row-gap: 0; }
    @media (max-width: 1279px) { [data-nav-main] .nav-main-list { column-gap: ${gapTablet}px; } }
    [data-nav-mobile] .nav-mobile-list { row-gap: ${gapMobile / 2}px; }
  `;

  const badgeStyle = (bg?: string | null, color?: string | null): React.CSSProperties => ({
    ...(bg ? { backgroundColor: bg } : {}),
    ...(color ? { color } : {}),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [navRes, catRes, fRes] = await Promise.all([
        supabase.from("nav_links").select("id,label,href,open_in_new_tab,is_active,sort_order").eq("is_active", true).order("sort_order"),
        supabase.from("categories").select("*").eq("type", "product").eq("is_active", true).order("sort_order").order("name"),
        (supabase.from as any)("menu_custom_fields").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (!alive) return;
      setNavItems((navRes.data as NavItem[]) ?? []);
      if (catRes.data) setCategories(catRes.data as CategoryItem[]);
      if (fRes?.data) setCustomFields(fRes.data as MenuCustomField[]);
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
              {visibleCategoriesMobile.map((c) => {
                const subs = (subsByParent[c.id] || []).filter((s) => s.menu_show_mobile !== false);
                const mobileFields = (fieldsByParent[c.id] || []).filter((f) => f.show_mobile);
                return (
                  <details key={c.id} className="group/m rounded-md">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2.5 font-medium hover:bg-secondary">
                      <span className="inline-flex items-center gap-2">
                        {c.icon && <span>{c.icon}</span>}
                        {labelOf(c)}
                        {c.menu_badge && (
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground" style={badgeStyle(c.menu_badge_bg, c.menu_badge_color)}>{c.menu_badge}</span>
                        )}
                      </span>
                      {(subs.length > 0 || mobileFields.length > 0) && (
                        <ChevronDown size={16} className="transition-transform group-open/m:rotate-180" />
                      )}
                    </summary>
                    {(subs.length > 0 || mobileFields.length > 0) && (
                      <div className="ml-4 mb-2 flex flex-col gap-0.5 border-l pl-2">
                        <Link to={`/categoria/${c.slug}`} className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary">
                          Ver toda la categoría
                        </Link>
                        {subs.map((s) => (
                          <Link key={s.id} to={`/categoria/${c.slug}/${s.slug}`} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                            {labelOf(s)}
                            {s.menu_badge && (
                              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent" style={badgeStyle(s.menu_badge_bg, s.menu_badge_color)}>{s.menu_badge}</span>
                            )}
                          </Link>
                        ))}
                        {mobileFields.map((f) => (
                          <Link key={f.id} to={f.href || "#"} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                            {f.title}
                            {f.badge_text && (
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={badgeStyle(f.badge_bg || "#35a936", f.badge_color || "#ffffff")}>{f.badge_text}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </details>
                );
              })}
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

      <nav data-nav-main className="relative hidden border-t border-border lg:block" style={navStyle}>
        <style>{navCss}</style>
        <div className="nav-main-list container-x flex items-center">
          {visibleCategoriesDesktop.map((c) => {
            const subs = subsByParent[c.id] || [];
            const fields = (fieldsByParent[c.id] || []).filter((f) => f.show_desktop);
            const isMega = (c.menu_type ?? "mega") === "mega" && (subs.length > 0 || fields.length > 0);
            const byCol = groupedSubs(c.id);
            const colFields = fieldsByCol(c.id);
            const allCols = Array.from(new Set<number>([...Object.keys(byCol).map(Number), ...Object.keys(colFields).map(Number)])).sort((a, b) => a - b);
            const linkClass = ({ isActive }: { isActive: boolean }) =>
              cn(
                "nav-main-link py-3 whitespace-nowrap border-b-2 transition-smooth inline-flex items-center gap-1.5",
                isActive && showUnderline ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              );
            if (!isMega) {
              return (
                <NavLink key={c.id} to={`/categoria/${c.slug}`} style={mainLinkStyle} className={linkClass}>
                  {labelOf(c)}
                  {c.menu_badge && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground" style={badgeStyle(c.menu_badge_bg, c.menu_badge_color)}>{c.menu_badge}</span>
                  )}
                </NavLink>
              );
            }
            return (
              <div key={c.id} className="static group">
                <NavLink to={`/categoria/${c.slug}`} style={mainLinkStyle} className={linkClass}>
                  {labelOf(c)}
                  {c.menu_badge && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground" style={badgeStyle(c.menu_badge_bg, c.menu_badge_color)}>{c.menu_badge}</span>
                  )}
                  <ChevronDown size={14} className="opacity-60 transition-transform group-hover:rotate-180" />
                </NavLink>
                <div className="invisible absolute left-0 right-0 top-full z-50 -translate-y-1 border-t border-border bg-popover opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="container-x grid gap-8 py-8" style={{ gridTemplateColumns: `repeat(${Math.max(allCols.length, 1) + (c.featured_enabled ? 1 : 0)}, minmax(0, 1fr))` }}>
                    {allCols.map((col) => {
                      const items = byCol[col] || [];
                      const cFields = colFields[col] || [];
                      const groups: Record<string, CategoryItem[]> = {};
                      items.forEach((s) => {
                        const k = s.menu_group_title || "";
                        (groups[k] ||= []).push(s);
                      });
                      return (
                        <div key={col} className="flex flex-col gap-5">
                          {Object.entries(groups).map(([gtitle, gitems]) => (
                            <div key={gtitle} className="flex flex-col gap-2">
                              {gtitle && (
                                <h4 className="text-xs font-bold uppercase tracking-wider text-success">{gtitle}</h4>
                              )}
                              <ul className="flex flex-col gap-1">
                                {gitems.map((s) => (
                                  <li key={s.id}>
                                    <Link to={`/categoria/${c.slug}/${s.slug}`} className="inline-flex items-center gap-2 py-1 text-sm text-popover-foreground hover:text-success">
                                      {labelOf(s)}
                                      {s.menu_badge && (
                                        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent" style={badgeStyle(s.menu_badge_bg, s.menu_badge_color)}>{s.menu_badge}</span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {cFields.map((f) => <CustomFieldNode key={f.id} f={f} />)}
                        </div>
                      );
                    })}
                    {c.featured_enabled && (c.featured_title || c.featured_image_url) && (
                      <Link to={c.featured_cta_href || `/categoria/${c.slug}`} className="group/feat flex flex-col overflow-hidden rounded-lg border border-border bg-secondary/50 transition-smooth hover:border-accent hover:shadow-md">
                        {c.featured_image_url && (
                          <img src={c.featured_image_url} alt={c.featured_title || ""} className="aspect-[16/10] w-full object-cover transition-transform group-hover/feat:scale-105" />
                        )}
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          {c.featured_title && <h5 className="font-display text-base text-foreground">{c.featured_title}</h5>}
                          {c.featured_text && <p className="text-xs text-muted-foreground line-clamp-3">{c.featured_text}</p>}
                          {c.featured_cta_label && (
                            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-accent">{c.featured_cta_label} →</span>
                          )}
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-1">
            {navItems.map((n) => renderNavLink(n, "px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"))}
          </div>
        </div>
      </nav>


    </header>
  );
};

const CustomFieldNode = ({ f }: { f: MenuCustomField }) => {
  const badge = f.badge_text && (
    <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: f.badge_bg || "#35a936", color: f.badge_color || "#ffffff" }}>{f.badge_text}</span>
  );
  if (f.field_type === "block" || f.field_type === "banner" || f.field_type === "image") {
    return (
      <Link to={f.href || "#"} className="group/cf flex flex-col overflow-hidden rounded-lg border border-border bg-secondary/40 transition-smooth hover:border-accent hover:shadow-md">
        {f.image_url && <img src={f.image_url} alt={f.title} className="aspect-[16/10] w-full object-cover transition-transform group-hover/cf:scale-105" />}
        <div className="flex flex-col gap-1 p-3">
          <h5 className="text-sm font-semibold text-foreground inline-flex items-center">{f.title}{badge}</h5>
          {f.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{f.subtitle}</p>}
          {f.cta_label && <span className="mt-1 text-xs font-semibold text-accent">{f.cta_label} →</span>}
        </div>
      </Link>
    );
  }
  if (f.field_type === "button") {
    return (
      <Link to={f.href || "#"} className="inline-flex items-center justify-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold uppercase text-accent-foreground hover:opacity-90">
        {f.title}{badge}
      </Link>
    );
  }
  if (f.field_type === "text") {
    return (
      <div className="text-xs text-muted-foreground">
        <div className="font-semibold text-foreground inline-flex items-center">{f.title}{badge}</div>
        {f.subtitle && <div>{f.subtitle}</div>}
      </div>
    );
  }
  if (f.field_type === "badge") {
    return (
      <Link to={f.href || "#"} className="inline-flex items-center gap-2 py-1 text-sm text-popover-foreground hover:text-success">
        {f.title}{badge}
      </Link>
    );
  }
  // default link
  return (
    <Link to={f.href || "#"} className="inline-flex items-center gap-1 py-1 text-sm text-popover-foreground hover:text-success">
      {f.title}{badge}
    </Link>
  );
};
