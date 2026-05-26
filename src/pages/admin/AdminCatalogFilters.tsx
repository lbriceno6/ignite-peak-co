import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FILTER_META,
  RECOMMENDED_CONFIG,
  normalizeConfig,
  type CatalogFilterConfig,
  type CatalogFilterKey,
} from "@/hooks/useCatalogFilterSettings";

const SECONDARY: CatalogFilterKey[] = ["brand", "supplier", "rating", "size"];

const AdminCatalogFilters = () => {
  const [config, setConfig] = useState<CatalogFilterConfig>(RECOMMENDED_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalog_filter_settings" as any)
        .select("config")
        .eq("id", 1)
        .maybeSingle();
      setConfig(normalizeConfig((data as any)?.config));
      setLoading(false);
    })();
  }, []);

  const update = (key: CatalogFilterKey, patch: Partial<{ enabled: boolean; order: number }>) =>
    setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("catalog_filter_settings" as any)
      .upsert({ id: 1, config, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error("No se pudo guardar: " + error.message);
    else toast.success("Configuración de filtros guardada.");
  };

  const setAll = (enabled: boolean, only?: CatalogFilterKey[]) => {
    setConfig((c) => {
      const next = { ...c };
      for (const k of Object.keys(next) as CatalogFilterKey[]) {
        if (!only || only.includes(k)) next[k] = { ...next[k], enabled };
      }
      return next;
    });
  };

  const restoreRecommended = () => setConfig({ ...RECOMMENDED_CONFIG });

  const sorted = [...FILTER_META].sort(
    (a, b) => (config[a.key]?.order ?? 99) - (config[b.key]?.order ?? 99),
  );

  if (loading) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Filtros del catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activa o desactiva los filtros que verán los clientes en el catálogo y define su orden.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={restoreRecommended}>Restaurar recomendado</Button>
          <Button variant="outline" onClick={() => setAll(true)}>Activar todos</Button>
          <Button variant="outline" onClick={() => setAll(false, SECONDARY)}>Desactivar secundarios</Button>
          <Button variant="dark" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="grid grid-cols-[1fr_120px_100px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Filtro</div>
          <div className="text-center">Estado</div>
          <div className="text-center">Orden</div>
        </div>
        {sorted.map((f) => {
          const c = config[f.key];
          return (
            <div key={f.key} className="grid grid-cols-[1fr_120px_100px] items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <div>
                <div className="font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Switch checked={c.enabled} onCheckedChange={(v) => update(f.key, { enabled: !!v })} />
                <span className="text-xs text-muted-foreground">{c.enabled ? "Activo" : "Oculto"}</span>
              </div>
              <div className="flex justify-center">
                <Input
                  type="number"
                  min={1}
                  value={c.order}
                  onChange={(e) => update(f.key, { order: Number(e.target.value) || 0 })}
                  className="h-9 w-20 text-center"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="dark" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCatalogFilters;
