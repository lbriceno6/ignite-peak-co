import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container-x py-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
};
