import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Users, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/products/new", label: "New product", icon: Plus },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/customers", label: "Customers", icon: Users },
];

export const AdminLayout = () => (
  <div className="flex min-h-screen bg-muted/30">
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background p-4 md:flex">
      <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to store
      </Link>
      <div className="mb-6 px-2 font-display text-2xl">
        VOLT<span className="text-accent">RA</span> <span className="text-xs text-muted-foreground">Admin</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive ? "bg-foreground text-background" : "hover:bg-muted",
              )
            }
          >
            <it.icon size={16} />
            {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main className="flex-1 p-6 md:p-10">
      <Outlet />
    </main>
  </div>
);
