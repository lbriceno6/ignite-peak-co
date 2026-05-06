import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="container-x py-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="container-x py-32 text-center">
        <h1 className="font-display text-4xl">Access denied</h1>
        <p className="mt-3 text-muted-foreground">You do not have permission to access this area.</p>
      </div>
    );
  }
  return <>{children}</>;
};
