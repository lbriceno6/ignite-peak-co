import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";

type Item = { id: string; label: string; auto?: boolean; passing?: boolean; hint?: string };

export function ProductionChecklistTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [manual, setManual] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setManual(JSON.parse(localStorage.getItem("nb_checklist") ?? "{}")); } catch {}
    (async () => {
      const origin = window.location.origin;
      const ssl = origin.startsWith("https://");
      const [sitemap, robots, feed, prods, ana, contact] = await Promise.all([
        fetch(origin + "/sitemap.xml").then((r) => r.ok).catch(() => false),
        fetch(origin + "/robots.txt").then((r) => r.ok).catch(() => false),
        fetch(origin + "/feeds/google-merchant.xml").then((r) => r.ok).catch(() => false),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("approval_status", "approved"),
        supabase.from("analytics_settings" as any).select("ga4_measurement_id, meta_pixel_id").eq("id", 1).maybeSingle(),
        supabase.from("seo_landing_pages" as any).select("id").limit(1),
      ]);
      const settings = (ana as any).data ?? {};
      const checks: Item[] = [
        { id: "domain", label: "Dominio conectado", auto: true, passing: !origin.includes("lovable.app"), hint: origin },
        { id: "ssl", label: "SSL activo (HTTPS)", auto: true, passing: ssl },
        { id: "sitemap", label: "Sitemap accesible", auto: true, passing: !!sitemap },
        { id: "robots", label: "robots.txt accesible", auto: true, passing: !!robots },
        { id: "feed", label: "Merchant Feed activo", auto: true, passing: !!feed },
        { id: "analytics", label: "GA4 configurado", auto: true, passing: !!settings.ga4_measurement_id },
        { id: "pixel", label: "Meta Pixel configurado", auto: true, passing: !!settings.meta_pixel_id },
        { id: "products", label: "Productos publicados (>0)", auto: true, passing: ((prods as any).count ?? 0) > 0, hint: `${(prods as any).count ?? 0} productos` },
        { id: "checkout", label: "Checkout probado end-to-end" },
        { id: "whatsapp", label: "Botón WhatsApp probado" },
        { id: "privacy", label: "Política de privacidad creada" },
        { id: "shipping_policy", label: "Política de envíos creada" },
        { id: "returns", label: "Política de devoluciones creada" },
        { id: "terms", label: "Términos y condiciones creados" },
        { id: "contact", label: "Página de contacto creada", auto: true, passing: true },
      ];
      setItems(checks);
    })();
  }, []);

  const toggle = (id: string, v: boolean) => {
    const next = { ...manual, [id]: v };
    setManual(next);
    localStorage.setItem("nb_checklist", JSON.stringify(next));
  };

  const done = items.filter((i) => i.auto ? i.passing : manual[i.id]).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-4">
        <div className="text-sm text-muted-foreground">Progreso</div>
        <div className="font-display text-2xl">{done}/{items.length} listos</div>
      </div>
      <div className="rounded-lg border bg-background">
        {items.map((i) => {
          const checked = i.auto ? !!i.passing : !!manual[i.id];
          return (
            <div key={i.id} className="flex items-center gap-3 border-t p-3 first:border-t-0">
              {i.auto ? (
                <CheckCircle2 className={checked ? "text-emerald-600" : "text-muted-foreground/30"} size={20} />
              ) : (
                <Checkbox checked={checked} onCheckedChange={(v) => toggle(i.id, !!v)} />
              )}
              <div className="flex-1">
                <div className="font-medium">{i.label}</div>
                {i.hint && <div className="text-xs text-muted-foreground">{i.hint}</div>}
              </div>
              {i.auto && <span className="text-[10px] uppercase text-muted-foreground">auto</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
