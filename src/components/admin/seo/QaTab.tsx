import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Status = "ok" | "warn" | "fail" | "pending";
type Check = { key: string; label: string; status: Status; detail?: string };

const SITE_BASE = (typeof window !== "undefined" ? window.location.origin : "https://ignite-peak-co.lovable.app");
const FEED_URL = "https://mphrhcuqzkbbnovmdbpc.supabase.co/functions/v1/merchant-feed";

async function head(url: string): Promise<{ ok: boolean; ct?: string; status: number }> {
  try {
    const r = await fetch(url, { method: "GET", headers: { Accept: "*/*" } });
    return { ok: r.ok, ct: r.headers.get("content-type") ?? undefined, status: r.status };
  } catch { return { ok: false, status: 0 }; }
}

export function QaTab() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setChecks([]);
    const out: Check[] = [];

    // 1. sitemap / robots / llms / feed
    for (const [key, path, expectedCt] of [
      ["sitemap", "/sitemap.xml", "xml"],
      ["robots", "/robots.txt", "text"],
      ["llms", "/llms.txt", "text"],
    ] as const) {
      const r = await head(SITE_BASE + path);
      const ctOk = r.ct?.includes(expectedCt) ?? false;
      out.push({
        key, label: `${path} accesible`,
        status: r.ok && ctOk ? "ok" : r.ok ? "warn" : "fail",
        detail: r.ok ? `${r.status} · ${r.ct}` : `HTTP ${r.status}`,
      });
    }

    // Merchant feed (edge function)
    {
      const r = await head(FEED_URL);
      out.push({
        key: "merchant", label: "Merchant Feed (edge function) accesible",
        status: r.ok && r.ct?.includes("xml") ? "ok" : r.ok ? "warn" : "fail",
        detail: r.ok ? `${r.status} · ${r.ct}` : `HTTP ${r.status}`,
      });
      const r2 = await head(SITE_BASE + "/feeds/google-merchant.xml");
      out.push({
        key: "merchant-clean", label: "/feeds/google-merchant.xml (URL limpia)",
        status: r2.ok ? "ok" : "warn",
        detail: r2.ok ? `${r2.status} · ${r2.ct}` : "Snapshot no generado — usa la URL del edge function en GMC",
      });
    }

    // 2. Schemas y OG
    const { data: products } = await supabase.from("products").select("id").eq("is_active", true).eq("approval_status", "approved");
    const { data: prodMeta } = await supabase.from("seo_meta" as any).select("entity_id, schema_jsonld, og_image, canonical").eq("entity_type", "product");
    const totalProducts = (products ?? []).length;
    const metaMap = new Map<string, any>();
    (prodMeta ?? []).forEach((m: any) => metaMap.set(m.entity_id, m));
    const productsWithSchema = (products ?? []).filter((p: any) => metaMap.get(p.id)?.schema_jsonld).length;
    const productsWithOg = (products ?? []).filter((p: any) => metaMap.get(p.id)?.og_image).length;

    out.push({
      key: "schema-products", label: "Productos con Schema Product",
      status: productsWithSchema === totalProducts ? "ok" : productsWithSchema > totalProducts * 0.7 ? "warn" : "fail",
      detail: `${productsWithSchema}/${totalProducts}`,
    });
    out.push({
      key: "og-products", label: "Productos con Open Graph (og_image)",
      status: productsWithOg === totalProducts ? "ok" : productsWithOg > totalProducts * 0.7 ? "warn" : "fail",
      detail: `${productsWithOg}/${totalProducts}`,
    });

    // 3. Landings con schema
    const { data: landings } = await supabase.from("seo_landing_pages" as any).select("id, kind, slug").eq("is_published", true);
    const { data: landingMeta } = await supabase.from("seo_meta" as any).select("entity_id, schema_jsonld").eq("entity_type", "landing");
    const landingMap = new Map<string, any>();
    (landingMeta ?? []).forEach((m: any) => landingMap.set(m.entity_id, m));
    const landingsWithSchema = (landings ?? []).filter((l: any) => landingMap.get(l.id)?.schema_jsonld).length;
    out.push({
      key: "schema-landings", label: "Landings con Schema CollectionPage",
      status: (landings ?? []).length === 0 ? "warn" : landingsWithSchema === (landings ?? []).length ? "ok" : "warn",
      detail: `${landingsWithSchema}/${(landings ?? []).length}`,
    });

    // 4. Imágenes accesibles (muestra 10)
    const { data: imgs } = await supabase.from("products").select("main_image, name").eq("is_active", true).not("main_image", "is", null).limit(10);
    let broken = 0; const brokenList: string[] = [];
    for (const p of (imgs ?? []) as any[]) {
      const r = await head(p.main_image);
      if (!r.ok) { broken++; brokenList.push(p.name); }
    }
    out.push({
      key: "images", label: "Imágenes principales accesibles (muestra 10)",
      status: broken === 0 ? "ok" : "warn",
      detail: broken === 0 ? "todas ok" : `${broken} rotas: ${brokenList.join(", ")}`,
    });

    // 5. URLs canónicas
    const badCanonical = (prodMeta ?? []).filter((m: any) => m.canonical && !m.canonical.includes("/producto/")).length;
    out.push({
      key: "canonical", label: "URLs canónicas válidas",
      status: badCanonical === 0 ? "ok" : "warn",
      detail: badCanonical === 0 ? "ok" : `${badCanonical} con canonical no estándar`,
    });

    // 6. 404 muestreo de rutas clave
    const routes = ["/", "/productos", "/blog", "/contacto"];
    let missing = 0;
    for (const r of routes) { const h = await head(SITE_BASE + r); if (!h.ok) missing++; }
    out.push({
      key: "no-404", label: "Rutas principales sin 404",
      status: missing === 0 ? "ok" : "fail",
      detail: missing === 0 ? `${routes.length} rutas ok` : `${missing} rutas con error`,
    });

    setChecks(out);
    setRunning(false);
  };

  const exportFullReport = async () => {
    const { exportFullSeoReport } = await import("@/lib/seoFullReport");
    await exportFullSeoReport(checks);
    toast.success("Reporte exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" onClick={run} disabled={running}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Ejecutar validación
        </Button>
        <Button variant="outline" onClick={exportFullReport} disabled={checks.length === 0}>
          <Download size={14} /> Exportar reporte completo
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Check</th><th className="p-3">Estado</th><th className="p-3">Detalle</th></tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.key} className="border-t">
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3"><StatusBadge s={c.status} /></td>
                <td className="p-3 text-muted-foreground">{c.detail ?? "—"}</td>
              </tr>
            ))}
            {checks.length === 0 && !running && (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Haz clic en "Ejecutar validación" para comenzar</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const StatusBadge = ({ s }: { s: Status }) => {
  if (s === "ok") return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 size={12} className="mr-1" /> OK</Badge>;
  if (s === "warn") return <Badge className="bg-amber-500 hover:bg-amber-500"><AlertTriangle size={12} className="mr-1" /> Aviso</Badge>;
  if (s === "fail") return <Badge variant="destructive"><XCircle size={12} className="mr-1" /> Fallo</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};
