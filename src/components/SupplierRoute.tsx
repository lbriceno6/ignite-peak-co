import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldAlert, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SupplierRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, supplierStatus, isSupplier } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: "/supplier" }} />;

  if (isSupplier) return <>{children}</>;

  // Not yet a supplier: show appropriate screen
  return (
    <div className="container-x py-20">
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        {supplierStatus === "pending" ? (
          <>
            <Clock className="mx-auto h-10 w-10 text-accent" />
            <h1 className="mt-4 font-display text-2xl">Cuenta en revisión</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu solicitud para vender en el marketplace está siendo revisada. Te notificaremos por correo cuando sea aprobada.
            </p>
          </>
        ) : supplierStatus === "suspended" || supplierStatus === "rejected" ? (
          <>
            <Ban className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl">
              {supplierStatus === "suspended" ? "Cuenta suspendida" : "Solicitud rechazada"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Contáctanos para resolver el estado de tu cuenta de proveedor.
            </p>
          </>
        ) : (
          <>
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl">¿Eres marca?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Regístrate como proveedor para vender tus productos en nuestro marketplace.
            </p>
            <Button asChild variant="dark" className="mt-5">
              <Link to="/supplier/signup">Crear cuenta de proveedor</Link>
            </Button>
          </>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
};
