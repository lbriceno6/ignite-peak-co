import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, Clock, Ban, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SupplierRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  description: string | null;
  rejection_reason: string | null;
};

const ResubmitForm = ({ onSubmitted }: { onSubmitted: () => void }) => {
  const { user, refreshSupplier } = useAuth();
  const [row, setRow] = useState<SupplierRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("suppliers")
      .select("id,business_name,contact_name,phone,description,rejection_reason")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRow(data as SupplierRow | null));
  }, [user?.id]);

  if (!row) return <div className="grid h-32 place-items-center"><Loader2 className="animate-spin" /></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row.business_name.trim()) { toast.error("El nombre comercial es obligatorio"); return; }
    setSaving(true);
    const { error } = await supabase.from("suppliers").update({
      business_name: row.business_name,
      contact_name: row.contact_name,
      phone: row.phone,
      description: row.description,
      status: "pending",
    }).eq("id", row.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitud reenviada. Te avisaremos cuando la revisemos.");
    await refreshSupplier();
    onSubmitted();
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      {row.rejection_reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle size={14} /> Motivo del rechazo
          </div>
          <p className="mt-1 text-muted-foreground">{row.rejection_reason}</p>
        </div>
      )}
      <div>
        <Label>Nombre comercial *</Label>
        <Input value={row.business_name} onChange={(e) => setRow({ ...row, business_name: e.target.value })} maxLength={120} />
      </div>
      <div>
        <Label>Persona de contacto</Label>
        <Input value={row.contact_name ?? ""} onChange={(e) => setRow({ ...row, contact_name: e.target.value })} maxLength={120} />
      </div>
      <div>
        <Label>Teléfono</Label>
        <Input value={row.phone ?? ""} onChange={(e) => setRow({ ...row, phone: e.target.value })} maxLength={20} />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea rows={3} value={row.description ?? ""} onChange={(e) => setRow({ ...row, description: e.target.value })} maxLength={500} />
      </div>
      <Button type="submit" variant="dark" className="w-full" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        Reenviar solicitud
      </Button>
    </form>
  );
};

export const SupplierRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, supplierStatus, isSupplier } = useAuth();
  const [resubmitting, setResubmitting] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: "/supplier" }} />;
  if (isSupplier) return <>{children}</>;

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        {supplierStatus === "pending" ? (
          <>
            <Clock className="mx-auto h-10 w-10 text-accent" />
            <h1 className="mt-4 font-display text-2xl">Cuenta en revisión</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu solicitud para vender en el marketplace está siendo revisada. Te notificaremos cuando sea aprobada.
            </p>
          </>
        ) : supplierStatus === "rejected" ? (
          resubmitting ? (
            <ResubmitForm onSubmitted={() => setResubmitting(false)} />
          ) : (
            <>
              <Ban className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 font-display text-2xl">Solicitud rechazada</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Revisa los datos de tu marca y vuelve a enviar la solicitud cuando estés listo.
              </p>
              <Button variant="dark" className="mt-5" onClick={() => setResubmitting(true)}>
                <RefreshCw size={14} className="mr-2" /> Editar y reenviar
              </Button>
            </>
          )
        ) : supplierStatus === "suspended" ? (
          <>
            <Ban className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl">Cuenta suspendida</h1>
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
