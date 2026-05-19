import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Save, X, Package, LogOut } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
};

const MyProfile = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      if (data) { setProfile(data as Profile); setForm(data as Profile); }
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name ?? "",
      phone: form.phone ?? "",
      address: form.address ?? "",
      city: form.city ?? "",
      postal_code: form.postal_code ?? "",
      country: form.country ?? "",
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setProfile({ ...(profile as Profile), ...form } as Profile);
    setEditing(false);
    toast.success("Perfil actualizado");
  };

  if (loading) return <Layout><div className="container-x py-20 text-center text-muted-foreground">Cargando…</div></Layout>;

  return (
    <Layout>
      <div className="container-x py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl uppercase">Mi perfil</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/my-orders"><Package size={16}/> Pedidos</Link></Button>
            <Button onClick={signOut} variant="ghost" size="sm"><LogOut size={16}/> Cerrar sesión</Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl uppercase">Información personal</h2>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={14}/> Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setForm(profile ?? {}); setEditing(false); }}><X size={14}/> Cancelar</Button>
                <Button size="sm" onClick={save}><Save size={14}/> Guardar</Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" value={form.full_name} editing={editing} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="Correo" value={profile?.email} editing={false} onChange={() => {}} />
            <Field label="Teléfono" value={form.phone} editing={editing} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Dirección" value={form.address} editing={editing} onChange={(v) => setForm({ ...form, address: v })} />
            <Field label="Ciudad" value={form.city} editing={editing} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="Código postal" value={form.postal_code} editing={editing} onChange={(v) => setForm({ ...form, postal_code: v })} />
            <Field label="País" value={form.country} editing={editing} onChange={(v) => setForm({ ...form, country: v })} />
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Miembro desde</Label>
              <p className="mt-1 font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const Field = ({ label, value, editing, onChange }: { label: string; value: string | null | undefined; editing: boolean; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-xs text-muted-foreground uppercase">{label}</Label>
    {editing ? (
      <Input className="mt-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <p className="mt-1 font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
    )}
  </div>
);

export default MyProfile;
