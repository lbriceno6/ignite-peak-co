import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate("/my-profile");
  };

  return (
    <Layout>
      <div className="container-x mx-auto max-w-md py-16">
        <h1 className="font-display text-4xl uppercase mb-6">Restablecer contraseña</h1>
        <form onSubmit={handle} className="space-y-4">
          <div><Label>Nueva contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Actualizando…" : "Actualizar contraseña"}</Button>
        </form>
      </div>
    </Layout>
  );
};

export default ResetPassword;
