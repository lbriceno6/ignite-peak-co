import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, XCircle } from "lucide-react";

type Alert = { level: "info" | "warn" | "error"; title: string; detail: string };

export function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    (async () => {
      const out: Alert[] = [];
      // Feed log
      const { data: feed } = await supabase.from("merchant_feed_logs" as any)
        .select("*").order("generated_at", { ascending: false }).limit(1).maybeSingle();
      if (feed) {
        const fl = feed as any;
        if (fl.invalid_products > 0) out.push({ level: "warn", title: "Merchant Feed con errores", detail: `${fl.invalid_products} productos inválidos en última generación` });
        if (fl.status !== "ok") out.push({ level: "error", title: "Feed estado: " + fl.status, detail: "Revisa la pestaña Merchant" });
      }
      // SEO meta noindex
      const { data: noidx } = await supabase.from("seo_meta" as any)
        .select("entity_type, entity_id").eq("noindex", true);
      if ((noidx ?? []).length > 0) out.push({ level: "warn", title: "Páginas con noindex", detail: `${(noidx ?? []).length} entidades marcadas noindex` });

      // Productos con score bajo
      const { data: low } = await supabase.from("seo_meta" as any)
        .select("entity_id, score").eq("entity_type", "product").lt("score", 70);
      if ((low ?? []).length > 0) out.push({ level: "info", title: "Productos con SEO bajo", detail: `${(low ?? []).length} productos con score < 70` });

      // Productos sin precio/stock
      const { data: prods } = await supabase.from("products")
        .select("id, name, price, stock").eq("is_active", true).eq("approval_status", "approved");
      const noPrice = (prods ?? []).filter((p: any) => !p.price || p.price <= 0).length;
      const noStock = (prods ?? []).filter((p: any) => p.stock == null).length;
      if (noPrice > 0) out.push({ level: "error", title: "Productos sin precio", detail: `${noPrice} productos publicados sin precio` });
      if (noStock > 0) out.push({ level: "warn", title: "Productos sin stock definido", detail: `${noStock} productos` });

      // Productos sin SEO meta (no en sitemap conceptual)
      const ids = new Set((prods ?? []).map((p: any) => p.id));
      const { data: metas } = await supabase.from("seo_meta" as any).select("entity_id").eq("entity_type", "product");
      const withMeta = new Set(((metas as any[]) ?? []).map((m) => m.entity_id));
      const missing = [...ids].filter((id) => !withMeta.has(id)).length;
      if (missing > 0) out.push({ level: "info", title: "Productos sin SEO meta", detail: `${missing} productos sin entrada en seo_meta` });

      // Búsquedas cero-resultado
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: zeros } = await supabase.from("search_logs" as any)
        .select("query").eq("results_count", 0).gte("created_at", since);
      if ((zeros ?? []).length > 10) out.push({ level: "warn", title: "Muchas búsquedas sin resultados", detail: `${(zeros ?? []).length} búsquedas vacías en 7 días` });

      // Sitemap reachable
      try {
        const r = await fetch(window.location.origin + "/sitemap.xml");
        if (!r.ok) out.push({ level: "error", title: "sitemap.xml no responde", detail: `HTTP ${r.status}` });
      } catch { out.push({ level: "error", title: "sitemap.xml no responde", detail: "error de red" }); }
      try {
        const r = await fetch(window.location.origin + "/robots.txt");
        if (!r.ok) out.push({ level: "error", title: "robots.txt no responde", detail: `HTTP ${r.status}` });
      } catch { out.push({ level: "error", title: "robots.txt no responde", detail: "error de red" }); }

      setAlerts(out);
    })();
  }, []);

  return (
    <div className="space-y-2">
      {alerts.length === 0 && <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">Sin alertas — todo en orden</div>}
      {alerts.map((a, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border bg-background p-4">
          {a.level === "error" && <XCircle className="text-destructive shrink-0" size={20} />}
          {a.level === "warn" && <AlertTriangle className="text-amber-500 shrink-0" size={20} />}
          {a.level === "info" && <Info className="text-blue-500 shrink-0" size={20} />}
          <div className="flex-1">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-muted-foreground">{a.detail}</div>
          </div>
          <Badge variant={a.level === "error" ? "destructive" : "outline"}>{a.level}</Badge>
        </div>
      ))}
    </div>
  );
}
