import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "submitting" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid === true) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error: err } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (err) throw err;
      if ((data as any)?.success) setState("done");
      else if ((data as any)?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch (e: any) {
      setError(e.message ?? "Error");
      setState("error");
    }
  };

  return (
    <Layout>
      <div className="container-x grid min-h-[60vh] place-items-center py-16">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          {state === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {state === "invalid" && (<>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl uppercase">Enlace inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">El enlace ha caducado o no es válido.</p>
          </>)}
          {state === "already" && (<>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 font-display text-2xl uppercase">Ya estás dado de baja</h1>
            <p className="mt-2 text-sm text-muted-foreground">No volverás a recibir nuestros correos.</p>
          </>)}
          {state === "valid" && (<>
            <h1 className="font-display text-2xl uppercase">¿Confirmar baja?</h1>
            <p className="mt-2 text-sm text-muted-foreground">Dejarás de recibir correos de Voltra Nutrition.</p>
            <Button variant="dark" className="mt-5 w-full" onClick={confirm}>Confirmar baja</Button>
          </>)}
          {state === "submitting" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {state === "done" && (<>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 font-display text-2xl uppercase">Baja confirmada</h1>
            <p className="mt-2 text-sm text-muted-foreground">No volverás a recibir nuestros correos.</p>
          </>)}
          {state === "error" && (<>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-2xl uppercase">No pudimos procesar</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error ?? "Intenta más tarde."}</p>
          </>)}
          <Button asChild variant="ghost" size="sm" className="mt-4">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
