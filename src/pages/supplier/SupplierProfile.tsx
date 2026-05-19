import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function SupplierProfile() {
  const { user, supplierId, refreshSupplier } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<any>({
    business_name: "", commercial_name: "", description: "", contact_name: "",
    email: "", phone: "", website: "", address: "", city: "", country: "",
    tax_id: "", payout_method: "", payout_account: "",
    logo_url: "", slug: "", commission_percent: 0,
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!supplierId) { setLoading(false); return; }
    supabase.from("suppliers").select("*").eq("id", supplierId).maybeSingle().then(({ data }) => {
      if (data) setF(data as any);
      setLoading(false);
    });
  }, [supplierId]);

  const uploadLogo = async (file: File) => {
    if (!supplierId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${supplierId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("supplier-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const url = supabase.storage.from("supplier-logos").getPublicUrl(path).data.publicUrl;
      set("logo_url", url);
      toast.success("Logo subido");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!supplierId) return;
    setSaving(true);
    const { error } = await supabase.from("suppliers").update({
      business_name: f.business_name,
      commercial_name: f.commercial_name,
      description: f.description,
      contact_name: f.contact_name,
      email: f.email,
      phone: f.phone,
      website: f.website,
      address: f.address,
      city: f.city,
      country: f.country,
      tax_id: f.tax_id,
      payout_method: f.payout_method,
      payout_account: f.payout_account,
      logo_url: f.logo_url,
    }).eq("id", supplierId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil actualizado");
    refreshSupplier();
  };

  if (loading) return <div className="grid h-60 place-items-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase">Perfil de tienda</h1>
        {f.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/proveedor/${f.slug}`} target="_blank">
              <ExternalLink size={14}/> Ver tienda pública
            </Link>
          </Button>
        )}
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marca</h2>
        <div className="flex items-start gap-4">
          {f.logo_url
            ? <img src={f.logo_url} alt="Logo" className="h-20 w-20 rounded-md border object-cover"/>
            : <div className="grid h-20 w-20 place-items-center rounded-md border bg-muted text-xs text-muted-foreground">Sin logo</div>}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} Subir logo
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}/>
            <p className="mt-1 text-xs text-muted-foreground">PNG/JPG cuadrado, mínimo 200×200.</p>
          </div>
        </div>
        <Fld label="Nombre comercial *"><Input value={f.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} maxLength={120}/></Fld>
        <Fld label="Nombre corto"><Input value={f.commercial_name ?? ""} onChange={(e) => set("commercial_name", e.target.value)} maxLength={80}/></Fld>
        <Fld label="Descripción"><Textarea rows={4} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={1000}/></Fld>
        <Fld label="URL pública"><Input value={f.slug ?? ""} disabled/></Fld>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Fld label="Persona de contacto"><Input value={f.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} maxLength={120}/></Fld>
          <Fld label="Correo"><Input value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} maxLength={255}/></Fld>
          <Fld label="Teléfono"><Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} maxLength={20}/></Fld>
          <Fld label="Sitio web"><Input value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} maxLength={255}/></Fld>
          <Fld label="Dirección"><Input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} maxLength={255}/></Fld>
          <Fld label="Ciudad"><Input value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} maxLength={120}/></Fld>
          <Fld label="País"><Input value={f.country ?? ""} onChange={(e) => set("country", e.target.value)} maxLength={120}/></Fld>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Datos fiscales y pago</h2>
        <p className="text-xs text-muted-foreground">Información usada para liquidar tus comisiones. Solo nuestro equipo administrativo la ve.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Fld label="RUC / NIF / Tax ID"><Input value={f.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} maxLength={40}/></Fld>
          <Fld label="Método de pago"><Input placeholder="Transferencia, Yape, PayPal…" value={f.payout_method ?? ""} onChange={(e) => set("payout_method", e.target.value)} maxLength={50}/></Fld>
          <Fld label="Cuenta / Email / Número"><Input value={f.payout_account ?? ""} onChange={(e) => set("payout_account", e.target.value)} maxLength={120}/></Fld>
          <Fld label="Comisión actual">
            <Input value={`${Number(f.commission_percent ?? 0)} %`} disabled/>
          </Fld>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button variant="dark" onClick={save} disabled={saving} className="shadow-elevated">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
);
