// Diagnostic panel for the "Vistos recientemente · IA" home block.
// Lets admins inspect what the current browser stored locally, simulate
// a product view, and clear the local cache without leaving the admin.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, RotateCcw, FlaskConical, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  logBrowseEvent,
  getRecentlyViewedSlugsLocal,
  getLocalBrowseSignals,
  type LocalBrowseSignal,
} from "@/lib/recoEvents";
import { useAiBlockEnabled } from "@/hooks/useAiBlockToggles";
import { toast } from "sonner";

type ProductRow = { id: string; slug: string; name: string };

export function RecentlyViewedDiagnostic() {
  const enabled = useAiBlockEnabled("home_recently_viewed");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [signals, setSignals] = useState<LocalBrowseSignal[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pickerSlug, setPickerSlug] = useState("");
  const [remoteCount, setRemoteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshLocal = () => {
    setSlugs(getRecentlyViewedSlugsLocal(20));
    setSignals(getLocalBrowseSignals(20));
  };

  useEffect(() => {
    refreshLocal();
    (async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, slug, name")
        .eq("status", "active")
        .order("name")
        .limit(50);
      setProducts((data ?? []) as ProductRow[]);
    })();
    (async () => {
      try {
        const { count } = await (supabase as any)
          .from("lucia_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "browse_product_view");
        setRemoteCount(typeof count === "number" ? count : null);
      } catch {
        setRemoteCount(null);
      }
    })();
  }, []);

  const simulate = async () => {
    const slug = pickerSlug.trim();
    if (!slug) {
      toast.error("Selecciona o escribe un slug de producto");
      return;
    }
    const match = products.find((p) => p.slug === slug);
    setLoading(true);
    try {
      await logBrowseEvent("browse_product_view", {
        product_id: match?.id ?? null,
        product_slug: slug,
        metadata: { name: match?.name ?? slug, simulated_from: "admin_diagnostic" },
      });
      refreshLocal();
      toast.success(`Evento 'browse_product_view' registrado para ${slug}`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo registrar el evento");
    } finally {
      setLoading(false);
    }
  };

  const clearLocal = () => {
    try {
      window.localStorage.removeItem("recently_viewed_products");
      window.localStorage.removeItem("visitor_browse_signals");
      refreshLocal();
      toast.success("Historial local borrado");
    } catch {
      toast.error("No se pudo borrar el historial local");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye size={18} /> Vistos recientemente · Diagnóstico
              </CardTitle>
              <CardDescription>
                Estado del bloque IA en este navegador y origen de los datos.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={enabled ? "default" : "secondary"}>
                {enabled ? "Bloque activo" : "Bloque inactivo"}
              </Badge>
              <Button variant="ghost" size="sm" onClick={refreshLocal}>
                <RefreshCw size={14} className="mr-1" /> Refrescar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Productos en localStorage" value={slugs.length} hint="máx. 20" />
            <Stat label="Señales de navegación locales" value={signals.length} hint="máx. 50" />
            <Stat
              label="browse_product_view (total)"
              value={remoteCount ?? "—"}
              hint="lucia_events, todos los visitantes"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Slugs en historial local</h3>
            {slugs.length === 0 ? (
              <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Aún no hay productos vistos en este navegador. Visita una ficha de producto o usa
                el simulador de abajo.
              </p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {slugs.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s}</code>
                    <Link
                      to={`/producto/${s}`}
                      target="_blank"
                      className="text-xs text-primary hover:underline"
                    >
                      abrir <ExternalLink size={10} className="inline" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical size={18} /> Simular producto visto
          </CardTitle>
          <CardDescription>
            Inserta un evento <code>browse_product_view</code> como si un visitante hubiera abierto
            la ficha. Sirve para validar el bloque del Home sin tener que navegar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              list="diag-product-slugs"
              placeholder="slug-del-producto"
              value={pickerSlug}
              onChange={(e) => setPickerSlug(e.target.value)}
              className="max-w-sm"
            />
            <datalist id="diag-product-slugs">
              {products.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </datalist>
            <Button onClick={simulate} disabled={loading}>
              {loading ? "Registrando…" : "Simular vista"}
            </Button>
            <Button variant="outline" onClick={clearLocal}>
              <RotateCcw size={14} className="mr-1" /> Borrar historial local
            </Button>
            <Button asChild variant="outline">
              <Link to="/" target="_blank">
                Ver en Home <ExternalLink size={12} className="ml-1" />
              </Link>
            </Button>
          </div>

          {signals.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Últimas señales locales</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto / categoría / búsqueda</TableHead>
                    <TableHead className="text-right">Cuándo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((s, i) => (
                    <TableRow key={`${s.event_type}-${i}`}>
                      <TableCell>
                        <code className="text-xs">{s.event_type}</code>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.product_slug || s.category_slug || s.search_query || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
