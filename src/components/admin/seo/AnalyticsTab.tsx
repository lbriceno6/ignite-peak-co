import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export function AnalyticsTab() {
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("analytics_settings" as any).select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => setCfg(data ?? { id: 1 }));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("analytics_settings" as any).upsert({ ...cfg, id: 1 });
      if (error) throw error;
      toast.success("Configuración guardada. Recarga para aplicar los scripts.");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!cfg) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  const Row = ({ label, idKey, enabledKey, placeholder }: { label: string; idKey: string; enabledKey: string; placeholder: string }) => (
    <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">{label}</Label>
        <Input value={cfg[idKey] ?? ""} onChange={(e) => setCfg({ ...cfg, [idKey]: e.target.value })} placeholder={placeholder} />
      </div>
      <div className="flex items-center gap-2 sm:pl-4">
        <Switch checked={cfg[enabledKey] !== false} onCheckedChange={(v) => setCfg({ ...cfg, [enabledKey]: v })} />
        <span className="text-xs text-muted-foreground">{cfg[enabledKey] !== false ? "Activo" : "Pausado"}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        Configura los IDs públicos de cada plataforma. Los scripts se inyectan automáticamente al cargar el sitio.
      </p>

      <Row label="Google Analytics 4 — Measurement ID" idKey="ga4_measurement_id" enabledKey="ga4_enabled" placeholder="G-XXXXXXXXXX" />
      <Row label="Google Tag Manager — Container ID" idKey="gtm_container_id" enabledKey="gtm_enabled" placeholder="GTM-XXXXXXX" />
      <Row label="Meta Pixel — Pixel ID" idKey="meta_pixel_id" enabledKey="pixel_enabled" placeholder="123456789012345" />

      <div className="rounded-lg border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Google Ads — Conversion Tracking</Label>
          <div className="flex items-center gap-2">
            <Switch checked={cfg.ads_enabled !== false} onCheckedChange={(v) => setCfg({ ...cfg, ads_enabled: v })} />
            <span className="text-xs text-muted-foreground">{cfg.ads_enabled !== false ? "Activo" : "Pausado"}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Conversion ID</Label>
            <Input value={cfg.google_ads_conversion_id ?? ""} onChange={(e) => setCfg({ ...cfg, google_ads_conversion_id: e.target.value })} placeholder="AW-XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Conversion Label</Label>
            <Input value={cfg.google_ads_conversion_label ?? ""} onChange={(e) => setCfg({ ...cfg, google_ads_conversion_label: e.target.value })} placeholder="AbCdEfGhIjK" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="dark" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
        </Button>
      </div>
    </div>
  );
}
