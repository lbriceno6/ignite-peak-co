import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Minimal typed wrapper for beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("El servidor de autorización no devolvió un redirect."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6">
        <Card className="p-6 space-y-3">
          <h1 className="text-lg font-semibold">No se pudo cargar la autorización</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }
  if (!details) {
    return <main className="mx-auto max-w-md p-6 text-sm text-muted-foreground">Cargando…</main>;
  }

  const clientName = details.client?.name ?? "una aplicación";
  return (
    <main className="mx-auto max-w-md p-6">
      <Card className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Conectar {clientName} a tu cuenta de Nutribatidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientName} podrá usar las herramientas habilitadas de Nutribatidos actuando como tú mientras estés conectado.
          </p>
        </div>
        {email && (
          <p className="text-xs text-muted-foreground">Sesión: <span className="font-medium">{email}</span></p>
        )}
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>Consultar tus pedidos y su seguimiento</li>
          <li>Ver tu perfil (nombre, correo, teléfono)</li>
          <li>Buscar productos del catálogo</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Esto no elude las políticas de seguridad ni los permisos internos de la tienda.
        </p>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">Aprobar</Button>
          <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">Cancelar</Button>
        </div>
      </Card>
    </main>
  );
}
