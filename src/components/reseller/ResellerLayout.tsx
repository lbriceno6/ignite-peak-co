import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Link2, ShoppingBag, Wallet, Settings, ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/NotificationsBell";

const nav = [
  { to: "/reseller", end: true, label: "Panel", icon: LayoutDashboard },
  { to: "/reseller/link", label: "Mi link y código", icon: Link2 },
  { to: "/reseller/sales", label: "Ventas", icon: ShoppingBag },
  { to: "/reseller/payouts", label: "Pagos", icon: Wallet },
  { to: "/reseller/settings", label: "Configuración", icon: Settings },
];

export const ResellerLayout = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>
        <div className="mb-6 px-1">
          <div className="font-display text-xl">Panel revendedor</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-auto justify-start gap-2" onClick={() => signOut()}>
          <LogOut size={14} /> Cerrar sesión
        </Button>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px]",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>
            <n.icon size={16} /> {n.label}
          </NavLink>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b bg-background px-4 md:px-6">
          <NotificationsBell />
        </header>
        <main className="flex-1 p-4 pb-24 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
