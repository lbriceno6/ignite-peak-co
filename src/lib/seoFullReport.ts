import { supabase } from "@/integrations/supabase/client";

type Check = { key: string; label: string; status: string; detail?: string };

function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export async function exportFullSeoReport(qaChecks: Check[]) {
  const sections: string[] = [];

  // Section 1: QA
  sections.push("# Auditoría técnica");
  sections.push(toCsv([["check", "estado", "detalle"], ...qaChecks.map((c) => [c.label, c.status, c.detail ?? ""])]));

  // Section 2: productos
  const { data: products } = await supabase.from("products").select("id, name, slug").eq("is_active", true).eq("approval_status", "approved");
  const { data: meta } = await supabase.from("seo_meta" as any).select("entity_id, score, seo_title, seo_description, schema_jsonld, og_image, noindex").eq("entity_type", "product");
  const metaMap = new Map<string, any>();
  (meta ?? []).forEach((m: any) => metaMap.set(m.entity_id, m));
  sections.push("\n# Productos");
  sections.push(toCsv([
    ["producto", "slug", "score", "schema_ok", "og_ok", "noindex", "errores"],
    ...((products ?? []) as any[]).map((p) => {
      const m = metaMap.get(p.id);
      const errs: string[] = [];
      if (!m) errs.push("sin SEO");
      else {
        if (!m.schema_jsonld) errs.push("sin schema");
        if (!m.og_image) errs.push("sin og_image");
        if ((m.score ?? 0) < 50) errs.push("score bajo");
      }
      return [p.name, p.slug, m?.score ?? 0, m?.schema_jsonld ? "sí" : "no", m?.og_image ? "sí" : "no", m?.noindex ? "sí" : "no", errs.join("; ")];
    }),
  ]));

  // Section 3: landings
  const { data: landings } = await supabase.from("seo_landing_pages" as any).select("id, kind, slug, title, is_published");
  sections.push("\n# Landings");
  sections.push(toCsv([
    ["kind", "slug", "title", "publicada"],
    ...((landings ?? []) as any[]).map((l) => [l.kind, l.slug, l.title, l.is_published ? "sí" : "no"]),
  ]));

  // Section 4: búsquedas sin resultados
  const { data: zeros } = await supabase.from("search_logs" as any).select("query, results_count, created_at").eq("results_count", 0).order("created_at", { ascending: false }).limit(200);
  sections.push("\n# Búsquedas sin resultados");
  sections.push(toCsv([["query", "fecha"], ...((zeros ?? []) as any[]).map((s) => [s.query, s.created_at])]));

  // Section 5: Merchant feed
  const { data: feedLog } = await supabase.from("merchant_feed_logs" as any).select("*").order("generated_at", { ascending: false }).limit(1).maybeSingle();
  sections.push("\n# Estado Merchant Feed (último log)");
  if (feedLog) {
    const fl = feedLog as any;
    sections.push(toCsv([
      ["fecha", "total", "válidos", "inválidos", "estado"],
      [fl.generated_at, fl.total_products, fl.valid_products, fl.invalid_products, fl.status],
    ]));
  } else {
    sections.push("Sin logs todavía");
  }

  // Section 6: Plan SEO (oportunidades)
  const { data: plan } = await supabase.from("seo_content_plan" as any).select("kind, title, status, target_keyword").order("created_at", { ascending: false }).limit(200);
  sections.push("\n# Oportunidades SEO (Content Plan)");
  sections.push(toCsv([
    ["tipo", "título", "estado", "keyword objetivo"],
    ...((plan ?? []) as any[]).map((p) => [p.kind, p.title, p.status, p.target_keyword ?? ""]),
  ]));

  download(`seo-reporte-${new Date().toISOString().slice(0, 10)}.csv`, sections.join("\n"));
}
