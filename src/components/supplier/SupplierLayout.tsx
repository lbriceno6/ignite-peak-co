import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Store, ArrowLeft, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/supplier", end: true, label: "Panel", icon: LayoutDashboard },
  { to: "/supplier/products", label: "Productos", icon: Package },
  { to: "/supplier/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/supplier/profile", label: "Perfil de tienda", icon: Store },
];

export const SupplierLayout = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>
        <div className="mb-6 px-1">
          <div className="font-display text-xl">Panel proveedor</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-auto justify-start gap-2" onClick={() => signOut()}>
          <LogOut size={14} /> Cerrar sesión
        </Button>
      </aside>

      {/* Mobile nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) =>
            cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", isActive ? "text-foreground" : "text-muted-foreground")
          }>
            <n.icon size={16} /> {n.label}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 p-4 pb-24 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
