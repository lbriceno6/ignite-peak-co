import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Pencil, ExternalLink, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AuditTab } from "@/components/admin/seo/AuditTab";
import { MerchantTab } from "@/components/admin/seo/MerchantTab";
import { SearchTab } from "@/components/admin/seo/SearchTab";
import { SynonymsTab } from "@/components/admin/seo/SynonymsTab";
import { GscTab } from "@/components/admin/seo/GscTab";
import { ClaimsTab } from "@/components/admin/seo/ClaimsTab";
import { QaTab } from "@/components/admin/seo/QaTab";
import { AnalyticsTab } from "@/components/admin/seo/AnalyticsTab";
import { PerformanceTab } from "@/components/admin/seo/PerformanceTab";
import { FunnelTab } from "@/components/admin/seo/FunnelTab";
import { ContentPlanTab } from "@/components/admin/seo/ContentPlanTab";
import { RedirectsTab } from "@/components/admin/seo/RedirectsTab";
import { ProductionTestsTab } from "@/components/admin/seo/ProductionTestsTab";
import { EventsQaTab } from "@/components/admin/seo/EventsQaTab";
import { AnalyticsDebugTab } from "@/components/admin/seo/AnalyticsDebugTab";
import { MerchantValidationTab } from "@/components/admin/seo/MerchantValidationTab";
import { ChangeHistoryTab } from "@/components/admin/seo/ChangeHistoryTab";
import { AlertsTab } from "@/components/admin/seo/AlertsTab";
import { SearchMonitorTab } from "@/components/admin/seo/SearchMonitorTab";
import { ClaimsScannerTab } from "@/components/admin/seo/ClaimsScannerTab";
import { ProductionChecklistTab } from "@/components/admin/seo/ProductionChecklistTab";
import { ReportsTab } from "@/components/admin/seo/ReportsTab";
import { scoreBadgeClass } from "@/lib/seoScore";
import { exportFullSeoReport } from "@/lib/seoFullReport";
import { Download } from "lucide-react";

type Row = {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  seo?: { score: number | null; seo_title: string | null; seo_description: string | null; noindex: boolean } | null;
};

export default function AdminSeo() {
  const [productRows, setProductRows] = useState<Row[]>([]);
  const [blogRows, setBlogRows] = useState<Row[]>([]);
  const [catRows, setCatRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    const [{ data: products }, { data: posts }, { data: cats }, { data: metas }, { data: st }] = await Promise.all([
      supabase.from("products").select("id, name, slug").order("name").limit(200),
      supabase.from("blog_posts").select("id, title, slug").order("title").limit(200),
      supabase.from("categories").select("id, name, slug").order("name"),
      supabase.from("seo_meta" as any).select("entity_type, entity_id, score, seo_title, seo_description, noindex"),
      supabase.from("seo_settings" as any).select("*").eq("id", 1).maybeSingle(),
    ]);
    const byKey = new Map<string, any>();
    ((metas as any[]) ?? []).forEach((m) => byKey.set(`${m.entity_type}:${m.entity_id}`, m));
    setProductRows((products ?? []).map((p) => ({ ...p, seo: byKey.get(`product:${p.id}`) ?? null })));
    setBlogRows((posts ?? []).map((p) => ({ ...p, name: p.title, seo: byKey.get(`blog:${p.id}`) ?? null })));
    setCatRows((cats ?? []).map((c) => ({ ...c, seo: byKey.get(`category:${c.id}`) ?? null })));
    setSettings(st ?? { id: 1, site_name: "Nutribatidos", default_title_template: "{title} | Nutribatidos", default_description: "", brand: "Nutribatidos", google_product_category: "", robots_extra: "", default_og_image: "" });
  };

  useEffect(() => { load(); }, []);

  const optimized = (rows: Row[]) => rows.filter((r) => (r.seo?.score ?? 0) >= 80).length;
  const withErrors = (rows: Row[]) => rows.filter((r) => r.seo && (r.seo.score ?? 0) < 50).length;
  const noSeo = (rows: Row[]) => rows.filter((r) => !r.seo).length;
  const total = productRows.length + blogRows.length + catRows.length;
  const allRows = [...productRows, ...blogRows, ...catRows];
  const avg = total > 0 ? Math.round(allRows.reduce((a, r) => a + (r.seo?.score ?? 0), 0) / total) : 0;

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase.from("seo_settings" as any).upsert({ ...settings, id: 1 });
      if (error) throw error;
      toast.success("Ajustes guardados");
    } catch (e: any) { toast.error(e.message); } finally { setSavingSettings(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">SEO Inteligente</h1>
          <p className="text-muted-foreground">Optimiza productos, categorías y blog para Google y buscadores con IA.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportFullSeoReport([])}>
          <Download size={14} /> Exportar reporte completo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score promedio" value={`${avg}/100`} hint={`${total} entidades`} />
        <Stat label="Optimizados" value={optimized(allRows)} hint="score ≥ 80" />
        <Stat label="Con errores" value={withErrors(allRows)} hint="score < 50" />
        <Stat label="Sin SEO" value={noSeo(allRows)} hint="aún no configurado" />
      </div>

      <Tabs defaultValue="products">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="qa">QA</TabsTrigger>
          <TabsTrigger value="merchant">Merchant</TabsTrigger>
          <TabsTrigger value="search">Buscador</TabsTrigger>
          <TabsTrigger value="synonyms">Sinónimos</TabsTrigger>
          <TabsTrigger value="gsc">Search Console</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="funnel">Embudo</TabsTrigger>
          <TabsTrigger value="content">Plan contenido</TabsTrigger>
          <TabsTrigger value="redirects">Redirecciones</TabsTrigger>
          <TabsTrigger value="prod-tests">Pruebas producción</TabsTrigger>
          <TabsTrigger value="events-qa">Eventos QA</TabsTrigger>
          <TabsTrigger value="ana-debug">Debug Analytics</TabsTrigger>
          <TabsTrigger value="merchant-val">Validación Feed</TabsTrigger>
          <TabsTrigger value="changes">Historial</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="search-mon">Monitor búsqueda</TabsTrigger>
          <TabsTrigger value="claims-scan">Escáner claims</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="settings">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
        <TabsContent value="qa" className="mt-4"><QaTab /></TabsContent>
        <TabsContent value="merchant" className="mt-4"><MerchantTab /></TabsContent>
        <TabsContent value="search" className="mt-4"><SearchTab /></TabsContent>
        <TabsContent value="synonyms" className="mt-4"><SynonymsTab /></TabsContent>
        <TabsContent value="gsc" className="mt-4"><GscTab /></TabsContent>
        <TabsContent value="claims" className="mt-4"><ClaimsTab /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
        <TabsContent value="performance" className="mt-4"><PerformanceTab /></TabsContent>
        <TabsContent value="funnel" className="mt-4"><FunnelTab /></TabsContent>
        <TabsContent value="content" className="mt-4"><ContentPlanTab /></TabsContent>
        <TabsContent value="redirects" className="mt-4"><RedirectsTab /></TabsContent>
        <TabsContent value="prod-tests" className="mt-4"><ProductionTestsTab /></TabsContent>
        <TabsContent value="events-qa" className="mt-4"><EventsQaTab /></TabsContent>
        <TabsContent value="ana-debug" className="mt-4"><AnalyticsDebugTab /></TabsContent>
        <TabsContent value="merchant-val" className="mt-4"><MerchantValidationTab /></TabsContent>
        <TabsContent value="changes" className="mt-4"><ChangeHistoryTab /></TabsContent>
        <TabsContent value="alerts" className="mt-4"><AlertsTab /></TabsContent>
        <TabsContent value="search-mon" className="mt-4"><SearchMonitorTab /></TabsContent>
        <TabsContent value="claims-scan" className="mt-4"><ClaimsScannerTab /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><ProductionChecklistTab /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>

        <TabsContent value="products" className="mt-4">
          <EntityTable entityType="product" rows={productRows} editHref={(r) => `/admin/products/${r.id}/edit`} publicHref={(r) => `/producto/${r.slug}`} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <EntityTable entityType="category" rows={catRows} editHref={() => `#`} publicHref={(r) => `/categoria/${r.slug}`} note="Categorías: usa Optimizar con IA (no hay editor manual aún)." />
        </TabsContent>
        <TabsContent value="blog" className="mt-4">
          <EntityTable entityType="blog" rows={blogRows} editHref={(r) => `/admin/blog/${r.id}/edit`} publicHref={(r) => `/blog/${r.slug}`} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {settings && (
            <div className="grid gap-4 rounded-lg border bg-background p-6 max-w-3xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre del sitio">
                  <Input value={settings.site_name ?? ""} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
                </Field>
                <Field label="Marca (Schema)">
                  <Input value={settings.brand ?? ""} onChange={(e) => setSettings({ ...settings, brand: e.target.value })} />
                </Field>
                <Field label="Plantilla de título ({title} se reemplaza)">
                  <Input value={settings.default_title_template ?? ""} onChange={(e) => setSettings({ ...settings, default_title_template: e.target.value })} />
                </Field>
                <Field label="Categoría Google Shopping (default)">
                  <Input value={settings.google_product_category ?? ""} onChange={(e) => setSettings({ ...settings, google_product_category: e.target.value })} placeholder="Ej: 436 (Health & Beauty)" />
                </Field>
                <Field label="Imagen OG por defecto"><Input value={settings.default_og_image ?? ""} onChange={(e) => setSettings({ ...settings, default_og_image: e.target.value })} /></Field>
              </div>
              <Field label="Meta descripción por defecto">
                <Textarea rows={2} value={settings.default_description ?? ""} onChange={(e) => setSettings({ ...settings, default_description: e.target.value })} />
              </Field>
              <Field label="Robots — reglas extra (se agregan a /robots.txt)">
                <Textarea rows={3} placeholder="Disallow: /privado" value={settings.robots_extra ?? ""} onChange={(e) => setSettings({ ...settings, robots_extra: e.target.value })} />
              </Field>
              <div className="flex justify-end">
                <Button variant="dark" onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar ajustes
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Stat = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 font-display text-2xl">{value}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);

const EntityTable = ({ rows, editHref, publicHref, entityType, note }: { rows: Row[]; editHref: (r: Row) => string; publicHref: (r: Row) => string; entityType: "product" | "blog" | "category"; note?: string }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, fail: 0 });

  const toggleAll = (v: boolean) => {
    const m: Record<string, boolean> = {};
    if (v) rows.forEach((r) => { m[r.id] = true; });
    setSelected(m);
  };

  const selectedIds = rows.filter((r) => selected[r.id]).map((r) => r.id);

  const runBulk = async () => {
    if (selectedIds.length === 0) return;
    setBulkRunning(true);
    setProgress({ done: 0, total: selectedIds.length, fail: 0 });
    let done = 0; let fail = 0;
    for (const id of selectedIds) {
      try {
        const { data, error } = await supabase.functions.invoke("seo-generate", { body: { entity_type: entityType, entity_id: id } });
        if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
        const s = (data as any).suggestion;
        // Auto-accept and upsert into seo_meta (bulk = quick wins)
        await supabase.from("seo_meta" as any).upsert({
          entity_type: entityType,
          entity_id: id,
          seo_title: s.seo_title,
          seo_description: s.seo_description,
          slug: s.slug,
          keywords: s.keywords ?? [],
          tags: s.tags ?? [],
          short_description: s.short_description,
          long_description: s.long_description,
          shopping_title: s.shopping_title,
          shopping_description: s.shopping_description,
          last_analyzed_at: new Date().toISOString(),
        }, { onConflict: "entity_type,entity_id" });
        // Alts
        const altRows = (s.image_alts ?? []).map((a: any) => ({ entity_type: entityType, entity_id: id, image_url: a.image_url, alt_text: a.alt_text }));
        if (altRows.length) await supabase.from("seo_image_alts" as any).upsert(altRows, { onConflict: "entity_type,entity_id,image_url" });
        done++;
      } catch (e: any) {
        fail++;
        toast.error(`${id.slice(0, 8)}: ${e.message}`);
      }
      setProgress({ done: done + fail, total: selectedIds.length, fail });
      await new Promise((r) => setTimeout(r, 600));
    }
    setBulkRunning(false);
    toast.success(`Completado: ${done} ok, ${fail} fallidos. Refresca para ver scores.`);
  };

  const allChecked = rows.length > 0 && selectedIds.length === rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{selectedIds.length} seleccionado(s)</span>
        <Button variant="dark" size="sm" disabled={selectedIds.length === 0 || bulkRunning} onClick={runBulk}>
          {bulkRunning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Optimizar con IA
        </Button>
        {bulkRunning && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Progress value={(progress.done / Math.max(1, progress.total)) * 100} className="w-40" />
            {progress.done}/{progress.total} ({progress.fail} fallidos)
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        {note && <div className="border-b bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30">{note}</div>}
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 w-8"><Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} /></th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Título SEO</th>
              <th className="p-3">Score</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = r.seo?.score ?? 0;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected((p) => ({ ...p, [r.id]: !!v }))} /></td>
                  <td className="p-3 font-medium">{r.name ?? r.title}</td>
                  <td className="p-3 text-muted-foreground">{r.slug}</td>
                  <td className="p-3 text-muted-foreground truncate max-w-[280px]">{r.seo?.seo_title ?? <span className="text-amber-600">— sin configurar —</span>}</td>
                  <td className="p-3">
                    {r.seo ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(s)}`}>{s}</span> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="icon" title="Editar"><Link to={editHref(r)}><Pencil size={14} /></Link></Button>
                    <Button asChild variant="ghost" size="icon" title="Ver"><Link to={publicHref(r)} target="_blank"><ExternalLink size={14} /></Link></Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sin elementos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
