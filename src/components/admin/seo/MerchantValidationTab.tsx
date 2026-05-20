import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

type Issue = { slug: string; name: string; problems: string[] };

const FEED_EDGE = "https://mphrhcuqzkbbnovmdbpc.supabase.co/functions/v1/merchant-feed";

function isInvalidUrl(u?: string | null) {
  if (!u) return true;
  try { const x = new URL(u); return !["http:", "https:"].includes(x.protocol); } catch { return true; }
}
function hasBadXmlChars(s?: string | null) {
  if (!s) return false;
  // unescaped ampersand or angle brackets that aren't entities
  return /&(?![a-z]+;|#\d+;)/i.test(s);
}

export function MerchantValidationTab() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<{ total: number; ok: number }>({ total: 0, ok: 0 });
  const [running, setRunning] = useState(false);

  const validate = async () => {
    setRunning(true);
    const { data } = await supabase.from("products")
      .select("slug, name, main_image, price, sale_price, stock, description, brand, category, gallery_images")
      .eq("is_active", true).eq("approval_status", "approved");
    const list = (data ?? []) as any[];
    const found: Issue[] = [];
    for (const p of list) {
      const problems: string[] = [];
      if (!p.main_image) problems.push("Sin imagen");
      else if (isInvalidUrl(p.main_image)) problems.push("Imagen con URL inválida");
      if (!p.price || p.price <= 0) problems.push("Sin precio");
      else if (!/^\d+(\.\d{1,2})?$/.test(String(p.price))) problems.push("Precio formato incorrecto");
      if (p.stock == null || p.stock < 0) problems.push("Sin stock");
      if (!p.description || p.description.length < 20) problems.push("Sin descripción");
      if (!p.brand) problems.push("Sin marca");
      if (!p.category) problems.push("Sin categoría");
      if (!p.slug || /[^a-z0-9-]/i.test(p.slug)) problems.push("Slug/URL inválido");
      if (hasBadXmlChars(p.name) || hasBadXmlChars(p.description)) problems.push("Caracteres especiales sin escapar");
      // availability
      const availability = p.stock > 0 ? "in stock" : "out of stock";
      if (!["in stock", "out of stock", "preorder"].includes(availability)) problems.push("Disponibilidad inválida");

      if (problems.length) found.push({ slug: p.slug, name: p.name, problems });
    }
    setIssues(found);
    setStats({ total: list.length, ok: list.length - found.length });
    setRunning(false);
  };

  const regenerate = async () => {
    setRunning(true);
    toast.info("Regenerando feed…");
    try {
      const r = await fetch(FEED_EDGE);
      if (!r.ok) throw new Error("HTTP " + r.status);
      toast.success("Feed regenerado");
      await validate();
    } catch (e: any) {
      toast.error(e.message);
      setRunning(false);
    }
  };

  const exportCsv = () => {
    const rows = [["slug", "nombre", "problemas"], ...issues.map((i) => [i.slug, i.name, i.problems.join(" | ")])];
    const csv = rows.map((r) => r.map((v) => /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "merchant-issues.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" onClick={validate} disabled={running}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Validar productos
        </Button>
        <Button variant="outline" onClick={regenerate} disabled={running}>Regenerar feed y validar ahora</Button>
        <Button variant="outline" onClick={exportCsv} disabled={issues.length === 0}><Download size={14} /> Exportar CSV</Button>
      </div>
      {stats.total > 0 && (
        <div className="flex gap-2 text-sm">
          <Badge className="bg-emerald-600">{stats.ok} válidos</Badge>
          <Badge variant="destructive">{issues.length} con problemas</Badge>
          <Badge variant="outline">{stats.total} total</Badge>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Producto</th><th className="p-3">Slug</th><th className="p-3">Problemas</th></tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.slug} className="border-t align-top">
                <td className="p-3 font-medium">{i.name}</td>
                <td className="p-3 text-xs text-muted-foreground">{i.slug}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{i.problems.map((p) => <Badge key={p} variant="destructive" className="text-xs">{p}</Badge>)}</div></td>
              </tr>
            ))}
            {issues.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">{stats.total > 0 ? "Sin problemas detectados" : "Sin validar"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
