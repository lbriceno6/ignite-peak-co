import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Download, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Issue = {
  entity_type: "product" | "blog" | "landing";
  entity_id: string;
  name: string;
  slug: string;
  issues: string[];
};

const wordCount = (s?: string | null) => (s ?? "").trim().split(/\s+/).filter(Boolean).length;

export function AuditTab() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: products }, { data: posts }, { data: landings }, { data: metas }, { data: alts }] = await Promise.all([
        supabase.from("products").select("id, name, slug, description, price, stock, main_image, gallery_images, is_active, approval_status").limit(2000),
        supabase.from("blog_posts").select("id, title, slug, content, is_published"),
        supabase.from("seo_landing_pages" as any).select("id, title, slug, kind, long_description"),
        supabase.from("seo_meta" as any).select("entity_type, entity_id, seo_title, seo_description, schema_jsonld"),
        supabase.from("seo_image_alts" as any).select("entity_type, entity_id, image_url, alt_text"),
      ]);

      const metaBy = new Map<string, any>();
      ((metas as any[]) ?? []).forEach((m) => metaBy.set(`${m.entity_type}:${m.entity_id}`, m));
      const altBy = new Map<string, Set<string>>();
      ((alts as any[]) ?? []).forEach((a) => {
        const k = `${a.entity_type}:${a.entity_id}`;
        if (!altBy.has(k)) altBy.set(k, new Set());
        if (a.alt_text) altBy.get(k)!.add(a.image_url);
      });

      const slugCounts = new Map<string, number>();
      (products ?? []).forEach((p: any) => slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1));

      const all: Issue[] = [];

      (products ?? []).forEach((p: any) => {
        const m = metaBy.get(`product:${p.id}`) ?? {};
        const altsFor = altBy.get(`product:${p.id}`) ?? new Set();
        const list: string[] = [];
        if (!m.seo_title) list.push("Meta title faltante");
        if (!m.seo_description) list.push("Meta description faltante");
        if ((slugCounts.get(p.slug) ?? 0) > 1) list.push("Slug duplicado");
        const images: string[] = [p.main_image, ...((p.gallery_images as any[]) ?? [])].filter(Boolean);
        if (images.some((u) => !altsFor.has(u))) list.push("Imagen sin alt text");
        const schema = m.schema_jsonld;
        if (schema) {
          const arr = Array.isArray(schema) ? schema : [schema];
          if (!arr.some((s: any) => s && s["@type"] === "Product")) list.push("Schema Product inválido");
        }
        if (!p.price || Number(p.price) <= 0) list.push("Producto sin precio");
        if (!p.stock || Number(p.stock) <= 0) list.push("Producto sin stock");
        if (!p.is_active || p.approval_status !== "approved") list.push("Producto fuera del merchant feed");
        if (!p.is_active || p.approval_status !== "approved") list.push("Producto fuera del sitemap");
        if (wordCount(p.description) < 300) list.push("Descripción menor a 300 palabras");
        if (list.length) all.push({ entity_type: "product", entity_id: p.id, name: p.name, slug: p.slug, issues: list });
      });

      (landings as any[] ?? []).forEach((l) => {
        const m = metaBy.get(`landing:${l.id}`) ?? {};
        const list: string[] = [];
        if (!m.seo_title) list.push("Meta title faltante");
        if (!m.seo_description) list.push("Meta description faltante");
        const html = (l.long_description || "") as string;
        if (!/\bh1\b/i.test(html) && !/^#\s/m.test(html)) list.push("Landing sin H1");
        const schema = m.schema_jsonld;
        const hasFaq = schema && (Array.isArray(schema) ? schema : [schema]).some((s: any) => s && s["@type"] === "FAQPage");
        if (!hasFaq) list.push("Landing sin FAQs");
        if (list.length) all.push({ entity_type: "landing", entity_id: l.id, name: l.title, slug: `${l.kind}/${l.slug}`, issues: list });
      });

      (posts ?? []).forEach((p: any) => {
        const m = metaBy.get(`blog:${p.id}`) ?? {};
        const list: string[] = [];
        if (!m.seo_title) list.push("Meta title faltante");
        if (!m.seo_description) list.push("Meta description faltante");
        const html = (p.content || "") as string;
        if (!/<a\s|\]\(\//i.test(html)) list.push("Blog sin enlaces internos");
        if (wordCount(p.content) < 300) list.push("Descripción menor a 300 palabras");
        if (list.length) all.push({ entity_type: "blog", entity_id: p.id, name: p.title, slug: p.slug, issues: list });
      });

      setIssues(all);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return issues;
    return issues.filter((i) => i.name.toLowerCase().includes(q) || i.issues.some((x) => x.toLowerCase().includes(q)));
  }, [filter, issues]);

  const downloadCsv = () => {
    const rows = [["tipo", "id", "nombre", "slug", "errores"]];
    issues.forEach((i) => rows.push([i.entity_type, i.entity_id, i.name, i.slug, i.issues.join(" | ")]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "seo-audit.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    issues.forEach((i) => i.issues.forEach((x) => { m[x] = (m[x] ?? 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [issues]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="animate-spin" size={16} /> Analizando…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Entidades con problemas" value={issues.length} />
        <Stat label="Total errores" value={issues.reduce((a, i) => a + i.issues.length, 0)} />
        <Stat label="Tipos de error" value={counts.length} />
        <Stat label="Top error" value={counts[0]?.[0] ?? "—"} small />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filtrar por nombre o error…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        <Button variant="dark" size="sm" onClick={downloadCsv}><Download size={14} /> Exportar CSV</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Tipo</th><th className="p-3">Nombre</th><th className="p-3">Errores</th><th className="p-3 text-right">Ver</th></tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={`${i.entity_type}:${i.entity_id}`} className="border-t align-top">
                <td className="p-3"><Badge variant="outline" className="uppercase">{i.entity_type}</Badge></td>
                <td className="p-3 font-medium">{i.name}<div className="text-xs text-muted-foreground">{i.slug}</div></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {i.issues.map((x) => (
                      <span key={x} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertTriangle size={10} /> {x}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right">
                  {i.entity_type === "product" && <Button asChild variant="ghost" size="icon"><Link to={`/admin/products/${i.entity_id}/edit`}><ExternalLink size={14} /></Link></Button>}
                  {i.entity_type === "blog" && <Button asChild variant="ghost" size="icon"><Link to={`/admin/blog/${i.entity_id}/edit`}><ExternalLink size={14} /></Link></Button>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sin problemas detectados 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Stat = ({ label, value, small }: { label: string; value: any; small?: boolean }) => (
  <div className="rounded-lg border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`mt-1 font-display ${small ? "text-sm" : "text-2xl"}`}>{value}</div>
  </div>
);
