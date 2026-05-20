import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";

type Status = "ok" | "warn" | "fail";
type Check = { key: string; label: string; status: Status; detail?: string };

const SITE = typeof window !== "undefined" ? window.location.origin : "https://ignite-peak-co.lovable.app";
const FEED_EDGE = "https://mphrhcuqzkbbnovmdbpc.supabase.co/functions/v1/merchant-feed";

async function fetchWithTimeout(url: string, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    const text = r.headers.get("content-type")?.includes("xml") || r.headers.get("content-type")?.includes("text")
      ? await r.text() : "";
    return { ok: r.ok, status: r.status, ct: r.headers.get("content-type") ?? "", text };
  } catch (e: any) {
    return { ok: false, status: 0, ct: "", text: "", error: e.message };
  } finally { clearTimeout(t); }
}

export function ProductionTestsTab() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: Check[] = [];

    const endpoints: Array<[string, string, "xml" | "text"]> = [
      ["sitemap", "/sitemap.xml", "xml"],
      ["sitemap-products", "/sitemap-products.xml", "xml"],
      ["sitemap-categories", "/sitemap-categories.xml", "xml"],
      ["sitemap-blog", "/sitemap-blog.xml", "xml"],
      ["sitemap-landings", "/sitemap-landings.xml", "xml"],
      ["sitemap-static", "/sitemap-static.xml", "xml"],
      ["robots", "/robots.txt", "text"],
      ["llms", "/llms.txt", "text"],
      ["merchant-clean", "/feeds/google-merchant.xml", "xml"],
    ];
    let robotsTxt = ""; let llmsTxt = "";
    for (const [key, path, kind] of endpoints) {
      const r = await fetchWithTimeout(SITE + path);
      const ctOk = kind === "xml" ? r.ct.includes("xml") : r.ct.includes("text");
      out.push({
        key, label: `${path} (200)`,
        status: r.ok && ctOk ? "ok" : r.ok ? "warn" : "fail",
        detail: r.ok ? `${r.status} · ${r.ct}` : `HTTP ${r.status}${(r as any).error ? " · " + (r as any).error : ""}`,
      });
      if (key === "robots") robotsTxt = r.text;
      if (key === "llms") llmsTxt = r.text;
    }

    // Merchant edge function
    const mf = await fetchWithTimeout(FEED_EDGE, 15000);
    out.push({
      key: "merchant-edge", label: "Merchant Feed edge function",
      status: mf.ok && mf.ct.includes("xml") ? "ok" : "fail",
      detail: mf.ok ? `${mf.status} · ${mf.ct}` : `HTTP ${mf.status}`,
    });
    // Valid XML check
    if (mf.text) {
      const valid = mf.text.includes("<rss") && mf.text.includes("</rss>") && mf.text.includes("<item>");
      out.push({
        key: "merchant-xml", label: "Merchant Feed XML válido",
        status: valid ? "ok" : "fail",
        detail: valid ? `${(mf.text.match(/<item>/g) ?? []).length} items` : "Estructura RSS inválida",
      });
    }

    // robots.txt contains Sitemap
    out.push({
      key: "robots-sitemap", label: "robots.txt contiene Sitemap",
      status: /Sitemap:/i.test(robotsTxt) ? "ok" : "warn",
      detail: /Sitemap:/i.test(robotsTxt) ? "ok" : "falta directiva Sitemap:",
    });

    // llms.txt contiene productos / categorías / páginas
    const llmsLow = llmsTxt.toLowerCase();
    out.push({
      key: "llms-content", label: "llms.txt referencia productos/categorías",
      status: (llmsLow.includes("producto") || llmsLow.includes("/producto/")) &&
              (llmsLow.includes("categor")) ? "ok" : "warn",
      detail: llmsTxt ? `${llmsTxt.length} bytes` : "vacío",
    });

    // Duplicados de title/description
    const { data: metas } = await supabase.from("seo_meta" as any)
      .select("entity_type, entity_id, seo_title, seo_description, canonical");
    const titleMap = new Map<string, number>(); const descMap = new Map<string, number>();
    let noCanon = 0;
    ((metas as any[]) ?? []).forEach((m) => {
      if (m.seo_title) titleMap.set(m.seo_title, (titleMap.get(m.seo_title) ?? 0) + 1);
      if (m.seo_description) descMap.set(m.seo_description, (descMap.get(m.seo_description) ?? 0) + 1);
      if (m.entity_type === "product" && !m.canonical) noCanon++;
    });
    const dupTitle = [...titleMap.values()].filter((n) => n > 1).length;
    const dupDesc = [...descMap.values()].filter((n) => n > 1).length;
    out.push({
      key: "dup-title", label: "Sin títulos duplicados",
      status: dupTitle === 0 ? "ok" : "warn",
      detail: dupTitle === 0 ? "ok" : `${dupTitle} títulos repetidos`,
    });
    out.push({
      key: "dup-desc", label: "Sin descripciones duplicadas",
      status: dupDesc === 0 ? "ok" : "warn",
      detail: dupDesc === 0 ? "ok" : `${dupDesc} descripciones repetidas`,
    });
    out.push({
      key: "canonical", label: "Productos con canonical",
      status: noCanon === 0 ? "ok" : "warn",
      detail: noCanon === 0 ? "todos" : `${noCanon} productos sin canonical`,
    });

    setChecks(out);
    setRunning(false);
  };

  const counts = checks.reduce((a, c) => { a[c.status]++; return a; }, { ok: 0, warn: 0, fail: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="dark" onClick={run} disabled={running}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Ejecutar pruebas
        </Button>
        {checks.length > 0 && (
          <div className="flex gap-2 text-sm">
            <Badge className="bg-emerald-600">{counts.ok} OK</Badge>
            <Badge className="bg-amber-500">{counts.warn} avisos</Badge>
            <Badge variant="destructive">{counts.fail} fallos</Badge>
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Prueba</th><th className="p-3">Estado</th><th className="p-3">Detalle</th></tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.key} className="border-t">
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3">
                  {c.status === "ok" && <Badge className="bg-emerald-600"><CheckCircle2 size={12} className="mr-1" />OK</Badge>}
                  {c.status === "warn" && <Badge className="bg-amber-500"><AlertTriangle size={12} className="mr-1" />Aviso</Badge>}
                  {c.status === "fail" && <Badge variant="destructive"><XCircle size={12} className="mr-1" />Fallo</Badge>}
                </td>
                <td className="p-3 text-muted-foreground">{c.detail}</td>
              </tr>
            ))}
            {checks.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Sin pruebas todavía</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
