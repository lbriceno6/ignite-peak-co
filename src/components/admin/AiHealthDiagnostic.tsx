// Combined diagnostic for: Banner dinámico IA, Lucía IA, and AI provider secrets.
// Used inside /admin/ia-control as the "Salud IA" tab (covers olas 4, 7 y 9).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sparkles, CheckCircle2, XCircle, RefreshCw, ExternalLink, MessageCircle, Image as ImageIcon } from "lucide-react";
import {
  fetchActiveIntents,
  fetchRecentBrowseSignals,
  resolveCurrentIntent,
  type Intent,
} from "@/lib/userPersonalization";
import { toast } from "sonner";

type ProviderRow = { provider: string; env_var: string; configured: boolean; default_model: string };
type HealthResponse = {
  providers: ProviderRow[];
  lucia: { sessions: number; messages: number };
  intents_active: number;
  events_last_7d: number;
  checked_at: string;
};

export function AiHealthDiagnostic() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [signalCount, setSignalCount] = useState(0);
  const [bannerImageCount, setBannerImageCount] = useState({ withImage: 0, total: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("ai-health");
      if (error) throw error;
      setHealth(data as HealthResponse);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo cargar el panel de salud IA");
    } finally {
      setLoading(false);
    }

    try {
      const [is, sg] = await Promise.all([
        fetchActiveIntents(),
        fetchRecentBrowseSignals(30),
      ]);
      setIntents(is);
      setSignalCount(sg.length);
      setIntent(resolveCurrentIntent(is, sg));
      const withImage = is.filter((i) => !!i.banner_image).length;
      setBannerImageCount({ withImage, total: is.length });
    } catch {}
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Provider secrets */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles size={18} /> Proveedores IA
              </CardTitle>
              <CardDescription>
                Secretos detectados en el servidor. Los valores nunca se exponen al navegador.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className="mr-1" /> Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !health ? (
            <p className="text-sm text-muted-foreground">Verificando proveedores…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Modelo por defecto</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(health?.providers ?? []).map((p) => (
                  <TableRow key={p.provider}>
                    <TableCell className="font-medium capitalize">{p.provider}</TableCell>
                    <TableCell><code className="text-xs">{p.env_var}</code></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.default_model}</TableCell>
                    <TableCell className="text-right">
                      {p.configured ? (
                        <Badge className="gap-1"><CheckCircle2 size={12} /> Configurado</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><XCircle size={12} /> Sin configurar</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Banner dinámico IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon size={18} /> Banner dinámico IA — detección en este visitante
          </CardTitle>
          <CardDescription>
            Resultado real del motor de intención sobre tus señales locales recientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Intenciones activas" value={intents.length} />
            <Stat label="Intenciones con banner image" value={`${bannerImageCount.withImage}/${bannerImageCount.total}`} />
            <Stat label="Señales recientes" value={signalCount} />
            <Stat label="Intención detectada" value={intent?.name ?? "—"} />
          </div>
          {intent ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p><span className="font-semibold">Slug:</span> <code>{intent.slug}</code></p>
              <p><span className="font-semibold">Título banner:</span> {intent.title || <em className="text-muted-foreground">vacío</em>}</p>
              <p>
                <span className="font-semibold">Imagen:</span>{" "}
                {intent.banner_image
                  ? <a href={intent.banner_image} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ver <ExternalLink size={10} className="inline" /></a>
                  : <span className="text-amber-600">sin imagen — usará fallback</span>}
              </p>
              <p><span className="font-semibold">Categorías:</span> {(intent.category_slugs ?? []).join(", ") || "—"}</p>
            </div>
          ) : (
            <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              No hay intención dominante en este navegador. Navega productos o categorías para
              alimentar señales y vuelve a refrescar.
            </p>
          )}
          {bannerImageCount.withImage < bannerImageCount.total && (
            <p className="text-xs text-amber-600">
              ⚠ {bannerImageCount.total - bannerImageCount.withImage} intenciones activas no tienen imagen de banner.
              El banner usará el fallback hasta que subas una imagen desde el editor de intenciones.
            </p>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/ia-intenciones">Editar intenciones <ExternalLink size={12} className="ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/" target="_blank">Probar en Home <ExternalLink size={12} className="ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lucia IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle size={18} /> Lucía IA — estado
          </CardTitle>
          <CardDescription>
            Conteo total de sesiones y mensajes acumulados por la asistente de la tienda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Sesiones de chat" value={health?.lucia.sessions ?? 0} />
            <Stat label="Mensajes" value={health?.lucia.messages ?? 0} />
            <Stat label="Eventos IA (últ. 7 días)" value={health?.events_last_7d ?? 0} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/chat-ai">Configurar Lucía <ExternalLink size={12} className="ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/" target="_blank">Abrir storefront <ExternalLink size={12} className="ml-1" /></Link>
            </Button>
          </div>
          {health && (
            <p className="text-xs text-muted-foreground">
              Última verificación: {new Date(health.checked_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
