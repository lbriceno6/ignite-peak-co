import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const sections = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/products/new", label: "New product", icon: Plus },
      { to: "/admin/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/home", label: "Home content", icon: Home },
      { to: "/admin/blog", label: "Blog posts", icon: FileText },
      { to: "/admin/blog/new", label: "New post", icon: Plus },
    ],
  },
];

const titleFromPath = (p: string) => {
  if (p === "/admin") return "Dashboard";
  if (p.startsWith("/admin/products/new")) return "New product";
  if (p.includes("/admin/products/") && p.endsWith("/edit")) return "Edit product";
  if (p.startsWith("/admin/products")) return "Products";
  if (p.startsWith("/admin/categories")) return "Categories";
  if (p.startsWith("/admin/orders/")) return "Order detail";
  if (p.startsWith("/admin/orders")) return "Orders";
  if (p.startsWith("/admin/customers")) return "Customers";
  if (p.startsWith("/admin/blog/new")) return "New post";
  if (p.includes("/admin/blog/") && p.endsWith("/edit")) return "Edit post";
  if (p.startsWith("/admin/blog")) return "Blog posts";
  if (p.startsWith("/admin/home")) return "Home content";
  return "Admin";
};

const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => (
  <>
    <Link
      to="/"
      onClick={onNavigate}
      className="mb-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={14} /> Back to store
    </Link>
    <div className="mb-8 px-1 font-display text-2xl">
      VOLT<span className="text-accent">RA</span>
      <span className="ml-2 text-xs font-medium text-muted-foreground">Admin</span>
    </div>
    <nav className="flex flex-col gap-6">
      {sections.map((s) => (
        <div key={s.label}>
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {s.label}
          </div>
          <div className="flex flex-col gap-1">
            {s.items.map((it) => (
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
                {it.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  </>
);

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const title = titleFromPath(location.pathname);
  const initial = (user?.email ?? "A").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <SidebarBody />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-background p-4">
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
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
