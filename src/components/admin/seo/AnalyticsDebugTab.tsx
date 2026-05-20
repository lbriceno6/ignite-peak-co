import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

declare global { interface Window { dataLayer?: any[]; gtag?: any; fbq?: any } }

export function AnalyticsDebugTab() {
  const [cfg, setCfg] = useState<any>(null);

  useEffect(() => {
    supabase.from("analytics_settings" as any).select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => setCfg(data));
  }, []);

  const ids = [
    { key: "GA4 Measurement ID", value: cfg?.ga4_measurement_id, enabled: cfg?.ga4_enabled },
    { key: "GTM Container ID", value: cfg?.gtm_container_id, enabled: cfg?.gtm_enabled },
    { key: "Meta Pixel ID", value: cfg?.meta_pixel_id, enabled: cfg?.pixel_enabled },
    { key: "Google Ads Conversion ID", value: cfg?.google_ads_conversion_id, enabled: cfg?.ads_enabled },
    { key: "Google Ads Conversion Label", value: cfg?.google_ads_conversion_label, enabled: cfg?.ads_enabled },
  ];

  const sendGa4 = () => {
    if (!window.gtag) return toast.error("gtag no cargado — revisa GA4 Measurement ID");
    window.gtag("event", "lovable_test_event", { source: "admin_debug", ts: Date.now() });
    toast.success("Evento test enviado a GA4");
  };
  const sendGtm = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "lovable_test_event", source: "admin_debug", ts: Date.now() });
    toast.success("Evento test enviado a dataLayer (GTM)");
  };
  const sendPixel = () => {
    if (!window.fbq) return toast.error("fbq no cargado — revisa Meta Pixel ID");
    window.fbq("trackCustom", "LovableTestEvent", { source: "admin_debug" });
    toast.success("Evento test enviado a Meta Pixel");
  };
  const sendAds = () => {
    if (!window.gtag || !cfg?.google_ads_conversion_id || !cfg?.google_ads_conversion_label) {
      return toast.error("Faltan IDs de Google Ads");
    }
    window.gtag("event", "conversion", {
      send_to: `${cfg.google_ads_conversion_id}/${cfg.google_ads_conversion_label}`,
      value: 1, currency: "PEN",
    });
    toast.success("Conversión test enviada a Google Ads");
  };
  const sendInternal = () => {
    track("view_item", { product_id: "test", source: "admin_debug" });
    toast.success("Evento test enviado a product_events");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Configuración</th><th className="p-3">Valor</th><th className="p-3">Estado</th></tr></thead>
          <tbody>
            {ids.map((i) => (
              <tr key={i.key} className="border-t">
                <td className="p-3 font-medium">{i.key}</td>
                <td className="p-3 font-mono text-xs">{i.value ?? "—"}</td>
                <td className="p-3">
                  {i.value && i.enabled
                    ? <Badge className="bg-emerald-600"><CheckCircle2 size={12} className="mr-1" />Activo</Badge>
                    : <Badge variant="destructive"><XCircle size={12} className="mr-1" />Falta</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
        <Button variant="dark" onClick={sendGa4}><Send size={14} /> Test GA4</Button>
        <Button variant="dark" onClick={sendGtm}><Send size={14} /> Test GTM</Button>
        <Button variant="dark" onClick={sendPixel}><Send size={14} /> Test Pixel</Button>
        <Button variant="dark" onClick={sendAds}><Send size={14} /> Test Google Ads</Button>
        <Button variant="outline" onClick={sendInternal}><Send size={14} /> Test interno</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Los eventos test se envían desde tu navegador. Verifica recepción en GA4 DebugView, Tag Assistant, Meta Events Manager o Google Ads.
      </p>
    </div>
  );
}
