import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

type Settings = { id: number; site_property: string | null; verification_token: string | null; verified_at: string | null; last_synced_at: string | null; notes: string | null };
type Url = { id: string; url: string; coverage_state: string | null; is_indexable: boolean; last_crawl_at: string | null };

const SITEMAP = "https://ignite-peak-co.lovable.app/sitemap.xml";

export function GscTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [urls, setUrls] = useState<Url[]>([]);

  const load = async () => {
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.from("seo_gsc_settings" as any).select("*").eq("id", 1).maybeSingle(),
      supabase.from("seo_gsc_urls" as any).select("*").order("last_synced_at", { ascending: false }).limit(200),
    ]);
    setSettings((s as any) ?? { id: 1, site_property: "", verification_token: "", verified_at: null, last_synced_at: null, notes: "" });
    setUrls(((u as any[]) ?? []) as Url[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    const { error } = await supabase.from("seo_gsc_settings" as any).upsert({ ...settings, id: 1 });
    if (error) toast.error(error.message); else toast.success("Guardado");
  };

  if (!settings) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  const indexable = urls.filter((u) => u.is_indexable);
  const notIndexable = urls.filter((u) => !u.is_indexable);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border bg-background p-6 max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Propiedad (URL del sitio)"><Input value={settings.site_property ?? ""} onChange={(e) => setSettings({ ...settings, site_property: e.target.value })} placeholder="https://ignite-peak-co.lovable.app/" /></Field>
          <Field label="Token de verificación (meta)"><Input value={settings.verification_token ?? ""} onChange={(e) => setSettings({ ...settings, verification_token: e.target.value })} placeholder="google-site-verification=..." /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={settings.verified_at ? "outline" : "destructive"}>
            {settings.verified_at ? `Verificado · ${new Date(settings.verified_at).toLocaleDateString()}` : "No verificado"}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setSettings({ ...settings, verified_at: new Date().toISOString() })}>Marcar como verificado</Button>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-accent hover:underline ml-auto"><ExternalLink size={12} /> Abrir GSC</a>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Sitemap:</span>
          <code className="flex-1 break-all text-xs">{SITEMAP}</code>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(SITEMAP); toast.success("Copiado"); }}><Copy size={12} /> Copiar</Button>
        </div>
        <div className="flex justify-end">
          <Button variant="dark" size="sm" onClick={save}><Save size={14} /> Guardar</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="URLs registradas" value={urls.length} />
        <Stat label="Indexables" value={indexable.length} tone="ok" />
        <Stat label="No indexables" value={notIndexable.length} tone="warn" />
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b p-3 text-sm font-semibold">URLs reportadas por Google Search Console</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">URL</th><th className="p-3">Estado</th><th className="p-3">Indexable</th><th className="p-3">Último crawl</th></tr></thead>
          <tbody>
            {urls.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 truncate max-w-[400px]">{u.url}</td>
                <td className="p-3 text-muted-foreground">{u.coverage_state ?? "—"}</td>
                <td className="p-3">{u.is_indexable ? <Badge variant="outline">sí</Badge> : <Badge variant="destructive">no</Badge>}</td>
                <td className="p-3 text-muted-foreground">{u.last_crawl_at ? new Date(u.last_crawl_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {!urls.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aún no se han sincronizado URLs desde GSC.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<div className="space-y-1.5"><Label>{label}</Label>{children}</div>);
const Stat = ({ label, value, tone }: { label: string; value: any; tone?: "ok" | "warn" }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display text-2xl ${tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
  </div>
);
