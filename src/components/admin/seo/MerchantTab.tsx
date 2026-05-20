import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Log = {
  id: string;
  generated_at: string;
  total_products: number;
  valid_products: number;
  invalid_products: number;
  errors_json: any;
  status: string;
};

const FEED_URL = `https://mphrhcuqzkbbnovmdbpc.supabase.co/functions/v1/merchant-feed`;

export function MerchantTab() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchant_feed_logs" as any).select("*").order("generated_at", { ascending: false }).limit(20);
    setLogs(((data as any[]) ?? []) as Log[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const regenerate = async () => {
    setRegen(true);
    try {
      const res = await fetch(FEED_URL + "?log=1");
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success("Feed regenerado");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setRegen(false); }
  };

  const last = logs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs text-muted-foreground">URL del feed (Google Merchant Center)</div>
          <div className="font-mono text-xs break-all">{FEED_URL}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(FEED_URL); toast.success("URL copiada"); }}><Copy size={14} /> Copiar</Button>
        <Button variant="dark" size="sm" onClick={regenerate} disabled={regen}>
          {regen ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerar y validar
        </Button>
      </div>

      {last && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total productos" value={last.total_products} />
          <Stat label="Válidos" value={last.valid_products} tone="ok" />
          <Stat label="Inválidos" value={last.invalid_products} tone="warn" />
          <Stat label="Última generación" value={new Date(last.generated_at).toLocaleString()} small />
        </div>
      )}

      <div className="rounded-lg border bg-background">
        <div className="border-b p-3 text-sm font-semibold">Errores por producto (último log)</div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left sticky top-0">
              <tr><th className="p-3">Producto</th><th className="p-3">Errores</th></tr>
            </thead>
            <tbody>
              {(last?.errors_json ?? []).map((e: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-3 font-medium">{e.name}<div className="text-xs text-muted-foreground">{e.id}</div></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(e.errors ?? []).map((x: string) => <Badge key={x} variant="outline">{x}</Badge>)}
                    </div>
                  </td>
                </tr>
              ))}
              {!last?.errors_json?.length && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">Sin errores en el último log</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b p-3 text-sm font-semibold">Historial</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Fecha</th><th className="p-3">Estado</th><th className="p-3">Total</th><th className="p-3">Válidos</th><th className="p-3">Inválidos</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground"><Loader2 size={14} className="inline animate-spin" /></td></tr> :
              logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{new Date(l.generated_at).toLocaleString()}</td>
                  <td className="p-3"><Badge variant={l.status === "ok" ? "outline" : "destructive"}>{l.status}</Badge></td>
                  <td className="p-3">{l.total_products}</td>
                  <td className="p-3 text-emerald-600">{l.valid_products}</td>
                  <td className="p-3 text-amber-600">{l.invalid_products}</td>
                </tr>
              ))}
            {!loading && !logs.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aún no se ha generado el feed</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone, small }: { label: string; value: any; tone?: "ok" | "warn"; small?: boolean }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display ${small ? "text-sm" : "text-2xl"} ${tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
  </div>
);
