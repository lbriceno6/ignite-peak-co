import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Pencil } from "lucide-react";

const sb: any = supabase;

type Goal = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  canonical_url: string | null;
  show_in_menu: boolean;
  show_in_home: boolean;
  show_in_sitemap: boolean;
  updated_at: string;
};

export default function GoalsLinksTable() {
  const [items, setItems] = useState<Goal[]>([]);
  const [redirCount, setRedirCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    setLoading(true);
    const [g, r] = await Promise.all([
      sb.from("goals").select("id,name,slug,is_active,canonical_url,show_in_menu,show_in_home,show_in_sitemap,updated_at").order("sort_order").order("name"),
      sb.from("seo_redirects").select("to_path").eq("active", true),
    ]);
    setItems((g.data as Goal[]) ?? []);
    const map: Record<string, number> = {};
    ((r.data as any[]) ?? []).forEach((row) => {
      map[row.to_path] = (map[row.to_path] ?? 0) + 1;
    });
    setRedirCount(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const copy = async (u: string) => {
    try { await navigator.clipboard.writeText(u); toast.success("URL copiada"); }
    catch { toast.error("No se pudo copiar"); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Objetivos · gestión de URL y SEO</CardTitle>
        <p className="text-xs text-muted-foreground">Cada objetivo se publica en /objetivo/[slug] con redirección 301 automática al cambiar el slug.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Slug</th>
                  <th className="py-2 pr-3">URL completa</th>
                  <th className="py-2 pr-3">Canónica</th>
                  <th className="py-2 pr-3">Menú</th>
                  <th className="py-2 pr-3">Home</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Redir.</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((g) => {
                  const path = `/objetivo/${g.slug}`;
                  const full = `${origin}${path}`;
                  return (
                    <tr key={g.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-medium">{g.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{g.slug}</td>
                      <td className="py-2 pr-3"><code className="text-xs">{path}</code></td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-[200px]">{g.canonical_url ?? full}</td>
                      <td className="py-2 pr-3 text-xs">{g.show_in_menu ? "Sí" : "No"}</td>
                      <td className="py-2 pr-3 text-xs">{g.show_in_home ? "Sí" : "No"}</td>
                      <td className="py-2 pr-3 text-xs">{g.is_active ? "Activo" : "Inactivo"}</td>
                      <td className="py-2 pr-3 text-xs">{redirCount[path] ?? 0}</td>
                      <td className="py-2 pr-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" title="Editar"><Link to="/admin/objetivos"><Pencil size={14} /></Link></Button>
                          <Button variant="ghost" size="icon" onClick={() => copy(full)} title="Copiar URL"><Copy size={14} /></Button>
                          <Button asChild variant="ghost" size="icon" title="Ver en tienda"><a href={path} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Sin objetivos. Crea uno en Administración → Objetivos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
