import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useReseller } from "@/hooks/useReseller";

export const ResellerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { reseller, loading } = useReseller();
  if (authLoading || loading) return <div className="container-x py-20 text-center text-muted-foreground">Cargando…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: "/reseller" }} replace />;
  if (!reseller) return <Navigate to="/programa-revendedor" replace />;
  return <>{children}</>;
};
