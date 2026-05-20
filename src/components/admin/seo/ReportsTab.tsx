import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { toast } from "sonner";

function toCsv(rows: any[][]) {
  return rows.map((r) => r.map((v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
function download(name: string, content: string, mime = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

async function exportTable(name: string, format: "csv" | "json", rows: any[], headers?: string[]) {
  if (format === "json") {
    download(`${name}.json`, JSON.stringify(rows, null, 2), "application/json");
  } else {
    const cols = headers ?? Object.keys(rows[0] ?? {});
    download(`${name}.csv`, toCsv([cols, ...rows.map((r) => cols.map((c) => r[c]))]));
  }
  toast.success(`${name}.${format} descargado`);
}

export function ReportsTab() {
  const queries: Array<{ key: string; label: string; load: () => Promise<any[]> }> = [
    { key: "seo-tecnico", label: "SEO técnico (seo_meta)", load: async () => (await supabase.from("seo_meta" as any).select("entity_type, entity_id, seo_title, seo_description, score, noindex, canonical")).data ?? [] },
    { key: "merchant-feed", label: "Merchant Feed logs", load: async () => (await supabase.from("merchant_feed_logs" as any).select("*")).data ?? [] },
    { key: "eventos", label: "Eventos ecommerce (últimos 1000)", load: async () => (await supabase.from("product_events" as any).select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [] },
    { key: "busquedas", label: "Búsquedas internas", load: async () => (await supabase.from("search_logs" as any).select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [] },
    { key: "redirecciones", label: "Redirecciones", load: async () => (await supabase.from("seo_redirects" as any).select("*")).data ?? [] },
    { key: "noindex", label: "Páginas no indexables", load: async () => (await supabase.from("seo_meta" as any).select("entity_type, entity_id, slug, robots_directive, noindex").eq("noindex", true)).data ?? [] },
    { key: "cambios", label: "Historial de cambios SEO", load: async () => (await supabase.from("seo_change_logs" as any).select("*").order("changed_at", { ascending: false }).limit(1000)).data ?? [] },
  ];

  const run = async (q: typeof queries[number], format: "csv" | "json") => {
    const rows = await q.load();
    if (!rows.length) return toast.error("Sin datos");
    await exportTable(q.key, format, rows);
  };

  return (
    <div className="space-y-2">
      {queries.map((q) => (
        <div key={q.key} className="flex items-center justify-between rounded-lg border bg-background p-3">
          <span className="font-medium">{q.label}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => run(q, "csv")}><Download size={14} /> CSV</Button>
            <Button size="sm" variant="outline" onClick={() => run(q, "json")}><Download size={14} /> JSON</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
