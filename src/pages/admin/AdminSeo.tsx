import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { scoreBadgeClass } from "@/lib/seoScore";

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
      <div>
        <h1 className="font-display text-3xl">SEO Inteligente</h1>
        <p className="text-muted-foreground">Optimiza productos, categorías y blog para Google y buscadores con IA.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score promedio" value={`${avg}/100`} hint={`${total} entidades`} />
        <Stat label="Optimizados" value={optimized(allRows)} hint="score ≥ 80" />
        <Stat label="Con errores" value={withErrors(allRows)} hint="score < 50" />
        <Stat label="Sin SEO" value={noSeo(allRows)} hint="aún no configurado" />
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="settings">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <EntityTable rows={productRows} editHref={(r) => `/admin/products/${r.id}/edit`} publicHref={(r) => `/producto/${r.slug}`} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <EntityTable rows={catRows} editHref={() => `#`} publicHref={(r) => `/categoria/${r.slug}`} note="Edición SEO de categorías llega en Etapa 2 (botón IA)." />
        </TabsContent>
        <TabsContent value="blog" className="mt-4">
          <EntityTable rows={blogRows} editHref={(r) => `/admin/blog/${r.id}/edit`} publicHref={(r) => `/blog/${r.slug}`} />
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

const EntityTable = ({ rows, editHref, publicHref, note }: { rows: Row[]; editHref: (r: Row) => string; publicHref: (r: Row) => string; note?: string }) => (
  <div className="overflow-x-auto rounded-lg border bg-background">
    {note && <div className="border-b bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30">{note}</div>}
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-left">
        <tr>
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
        {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin elementos</td></tr>}
      </tbody>
    </table>
  </div>
);
