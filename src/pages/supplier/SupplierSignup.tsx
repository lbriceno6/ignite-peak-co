import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Store } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  business_name: z.string().trim().min(2, "Nombre comercial requerido").max(120),
  contact_name: z.string().trim().min(2, "Nombre de contacto requerido").max(120),
  phone: z.string().trim().min(7, "Teléfono inválido").max(20),
  description: z.string().max(500).optional().or(z.literal("")),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

const SupplierSignup = () => {
  const nav = useNavigate();
  const { user, refreshSupplier } = useAuth();
  const [f, setF] = useState({
    email: user?.email ?? "",
    password: "",
    business_name: "",
    contact_name: "",
    phone: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(f);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      let uid = user?.id;
      if (!uid) {
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: `${window.location.origin}/supplier`,
            data: { full_name: f.contact_name, phone: f.phone },
          },
        });
        if (error) throw error;
        uid = data.user?.id;
        if (!uid) throw new Error("No se pudo crear la cuenta");
      }

      // Compute unique slug
      const base = slugify(f.business_name) || "tienda";
      let slug = base;
      let n = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: ex } = await supabase.from("suppliers").select("id").eq("slug", slug).maybeSingle();
        if (!ex) break;
        n += 1; slug = `${base}-${n}`;
        if (n > 50) break;
      }

      const { error: insErr } = await supabase.from("suppliers").insert({
        user_id: uid,
        business_name: f.business_name,
        contact_name: f.contact_name,
        email: f.email,
        phone: f.phone,
        description: f.description || null,
        slug,
        status: "pending",
        is_active: true,
      } as any);
      if (insErr) throw insErr;

      await refreshSupplier();
      toast.success("Solicitud enviada. Te avisaremos al aprobarla.");
      nav("/supplier");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo registrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container-x py-12">
        <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-2 text-accent">
            <Store /> <span className="text-xs font-semibold uppercase tracking-wider">Marketplace</span>
          </div>
          <h1 className="mt-2 font-display text-3xl uppercase">Vende con nosotros</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra tu marca y vende tus propios productos en nuestro marketplace.
            Tu solicitud será revisada por nuestro equipo antes de publicarse.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre comercial *</Label>
                <Input value={f.business_name} onChange={set("business_name")} maxLength={120} />
              </div>
              <div>
                <Label>Persona de contacto *</Label>
                <Input value={f.contact_name} onChange={set("contact_name")} maxLength={120} />
              </div>
              <div>
                <Label>Correo *</Label>
                <Input type="email" value={f.email} onChange={set("email")} disabled={!!user} maxLength={255} />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input value={f.phone} onChange={set("phone")} maxLength={20} />
              </div>
              {!user && (
                <div className="sm:col-span-2">
                  <Label>Contraseña *</Label>
                  <Input type="password" value={f.password} onChange={set("password")} minLength={8} maxLength={72} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Descripción de la marca</Label>
                <Textarea rows={3} value={f.description} onChange={set("description")} maxLength={500} />
              </div>
            </div>
            <Button type="submit" variant="dark" disabled={submitting} className="mt-2">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitud
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/auth" className="font-semibold underline">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SupplierSignup;
