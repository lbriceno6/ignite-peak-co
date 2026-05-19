import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  FileText,
  Plus,
  ArrowLeft,
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Home,
  Tags,
  GalleryHorizontal,
  Layers,
  PanelBottom,
  Link2,
  Mail,
  Info,
  Truck,
  Pencil,
  Check,
  Wallet,
  Instagram,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

const AdminCurrencySwitcher = () => {
  const { currency, setCurrency } = useCurrency();
  const meta = CURRENCIES[currency];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide" aria-label="Currency">
          <span>{meta.flag}</span> {currency}
          <ChevronDown size={12} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Display currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setCurrency(code)}
            className={cn(code === currency && "bg-secondary")}
          >
            <span className="mr-1">{CURRENCIES[code].flag}</span>
            <span className="font-semibold">{code}</span>
            <span className="ml-auto text-xs text-muted-foreground">{CURRENCIES[code].symbol}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const defaultSections = [
  {
    key: "overview",
    label: "Resumen",
    items: [{ key: "dashboard", to: "/admin", label: "Panel", icon: LayoutDashboard, end: true }],
  },
  {
    key: "catalog",
    label: "Catálogo",
    items: [
      { key: "products", to: "/admin/products", label: "Productos", icon: Package },
      { key: "products-new", to: "/admin/products/new", label: "Nuevo producto", icon: Plus },
      { key: "categories", to: "/admin/categories", label: "Categorías", icon: Tags },
      { key: "suppliers", to: "/admin/suppliers", label: "Proveedores", icon: Truck },
    ],
  },
  {
    key: "sales",
    label: "Ventas",
    items: [
      { key: "orders", to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
      { key: "customers", to: "/admin/customers", label: "Clientes", icon: Users },
      { key: "payments", to: "/admin/payments", label: "Métodos de pago", icon: Wallet },
      { key: "shipping", to: "/admin/shipping", label: "Envíos", icon: Truck },
      { key: "subscription", to: "/admin/subscription", label: "Suscríbete y ahorra", icon: Repeat },
    ],
  },
  {
    key: "content",
    label: "Contenido",
    items: [
      { key: "navigation", to: "/admin/navigation", label: "Logo y menú", icon: Menu },
      { key: "home", to: "/admin/home", label: "Contenido del home", icon: Home },
      { key: "home-blocks", to: "/admin/home-blocks", label: "Secciones del home", icon: Layers },
      { key: "hero-slides", to: "/admin/hero-slides", label: "Carrusel hero", icon: GalleryHorizontal },
      { key: "goal-cards", to: "/admin/goal-cards", label: "Tarjetas de objetivos", icon: Tags },
      { key: "testimonials", to: "/admin/testimonials", label: "Testimonios Instagram", icon: Instagram },
      { key: "blog", to: "/admin/blog", label: "Entradas de blog", icon: FileText },
      { key: "blog-new", to: "/admin/blog/new", label: "Nueva entrada", icon: Plus },
      { key: "footer", to: "/admin/footer", label: "Pie de página", icon: PanelBottom },
      { key: "site-links", to: "/admin/site-links", label: "Enlaces del sitio", icon: Link2 },
      { key: "about", to: "/admin/about", label: "Página Sobre", icon: Info },
      { key: "contact", to: "/admin/contact", label: "Página Contacto", icon: Mail },
    ],
  },
];

const LABELS_KEY = "voltra.admin.sidebarLabels";

const loadLabels = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || "{}"); } catch { return {}; }
};

const titleFromPath = (p: string, labels: Record<string, string>) => {
  const get = (k: string, fallback: string) => labels[`item:${k}`] || fallback;
  if (p === "/admin") return get("dashboard", "Panel");
  if (p.startsWith("/admin/products/new")) return get("products-new", "Nuevo producto");
  if (p.includes("/admin/products/") && p.endsWith("/edit")) return "Editar producto";
  if (p.startsWith("/admin/products")) return get("products", "Productos");
  if (p.startsWith("/admin/categories")) return get("categories", "Categorías");
  if (p.startsWith("/admin/suppliers")) return get("suppliers", "Proveedores");
  if (p.startsWith("/admin/orders/")) return "Detalle del pedido";
  if (p.startsWith("/admin/orders")) return get("orders", "Pedidos");
  if (p.startsWith("/admin/customers")) return get("customers", "Clientes");
  if (p.startsWith("/admin/payments")) return get("payments", "Métodos de pago");
  if (p.startsWith("/admin/shipping")) return get("shipping", "Envíos");
  if (p.startsWith("/admin/subscription")) return get("subscription", "Suscríbete y ahorra");
  if (p.startsWith("/admin/blog/new")) return get("blog-new", "Nueva entrada");
  if (p.includes("/admin/blog/") && p.endsWith("/edit")) return "Editar entrada";
  if (p.startsWith("/admin/blog")) return get("blog", "Entradas de blog");
  if (p.startsWith("/admin/home-blocks")) return get("home-blocks", "Secciones del home");
  if (p.startsWith("/admin/home")) return get("home", "Contenido del home");
  if (p.startsWith("/admin/hero-slides")) return get("hero-slides", "Carrusel hero");
  if (p.startsWith("/admin/goal-cards")) return get("goal-cards", "Tarjetas de objetivos");
  if (p.startsWith("/admin/navigation")) return get("navigation", "Logo y menú");
  if (p.startsWith("/admin/footer")) return get("footer", "Pie de página");
  if (p.startsWith("/admin/site-links")) return get("site-links", "Enlaces del sitio");
  if (p.startsWith("/admin/about")) return get("about", "Página Sobre");
  if (p.startsWith("/admin/contact")) return get("contact", "Página Contacto");
  return "Admin";
};

const SidebarBody = ({
  onNavigate,
  labels,
  editMode,
  onRename,
}: {
  onNavigate?: () => void;
  labels: Record<string, string>;
  editMode: boolean;
  onRename: (key: string, value: string) => void;
}) => (
  <>
    <Link
      to="/"
      onClick={onNavigate}
      className="mb-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={14} /> Volver a la tienda
    </Link>
    <div className="mb-8 px-1 font-display text-2xl">
      VOLT<span className="text-accent">RA</span>
      <span className="ml-2 text-xs font-medium text-muted-foreground">Admin</span>
    </div>
    <nav className="flex flex-col gap-6">
      {defaultSections.map((s) => {
        const sectionLabel = labels[`section:${s.key}`] ?? s.label;
        return (
          <div key={s.key}>
            {editMode ? (
              <input
                value={sectionLabel}
                onChange={(e) => onRename(`section:${s.key}`, e.target.value)}
                className="mb-2 w-full rounded border bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              />
            ) : (
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {sectionLabel}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {s.items.map((it) => {
                const itemLabel = labels[`item:${it.key}`] ?? it.label;
                if (editMode) {
                  return (
                    <div key={it.to} className="flex items-center gap-2 rounded-md px-2 py-1">
                      <it.icon size={16} className="text-muted-foreground" />
                      <input
                        value={itemLabel}
                        onChange={(e) => onRename(`item:${it.key}`, e.target.value)}
                        className="w-full rounded border bg-background px-2 py-1 text-sm"
                      />
                    </div>
                  );
                }
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    <it.icon size={16} />
                    {itemLabel}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  </>
);

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editLabels, setEditLabels] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>(() => loadLabels());
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const location = useLocation();
  const title = titleFromPath(location.pathname, labels);
  const initial = (user?.email ?? "A").charAt(0).toUpperCase();

  const handleRename = (key: string, value: string) => {
    setLabels((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(LABELS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Default admin display currency to Peruvian Soles on entering the admin area.
  useEffect(() => {
    try { localStorage.removeItem("voltra.currency.userChose"); } catch {}
    if (currency !== "PEN") setCurrency("PEN");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sidebarProps = { labels, editMode: editLabels, onRename: handleRename };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <SidebarBody {...sidebarProps} />
        <Button
          variant={editLabels ? "dark" : "outline"}
          size="sm"
          className="mt-4 gap-1.5"
          onClick={() => setEditLabels((v) => !v)}
        >
          {editLabels ? <><Check size={14} /> Listo</> : <><Pencil size={14} /> Renombrar enlaces</>}
        </Button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-background p-4 overflow-y-auto">
            <SidebarBody {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
            <Button
              variant={editLabels ? "dark" : "outline"}
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => setEditLabels((v) => !v)}
            >
              {editLabels ? <><Check size={14} /> Listo</> : <><Pencil size={14} /> Renombrar enlaces</>}
            </Button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top nav */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <nav className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Link to="/admin" className="flex items-center gap-1 hover:text-foreground">
                <Home size={14} /> Admin
              </Link>
              <span>/</span>
              <span className="font-medium text-foreground">{title}</span>
            </nav>
          </div>

          <div className="hidden flex-1 max-w-md md:flex">
            <div className="relative w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input placeholder="Search…" className="bg-muted/50 pl-9" />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <AdminCurrencySwitcher />
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={16} />
              <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px]">
                3
              </Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-xs font-medium leading-none">
                      {user?.email?.split("@")[0] ?? "Admin"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Administrator</span>
                  </div>
                  <ChevronDown size={14} className="hidden text-muted-foreground lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" /> Back to store
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
