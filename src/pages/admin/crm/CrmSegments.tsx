import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ESTADO_BADGE, ESTADO_LABEL, type CrmEstado } from "@/lib/crm";

/**
 * Segmentos dinámicos sobre la vista crm_customers. Reglas soportadas (jsonb):
 *  - { estado: "vip" | ... }
 *  - { min_orders: number, max_orders?: number }
 *  - { min_spent: number, max_spent?: number }
 *  - { days_inactive_min: number, days_inactive_max?: number }
 *  - { interest: "proteinas" | ... }
 *  - { city: "Lima" }
 */

const PRESETS: { code: string; name: string; rules: any }[] = [
  { code: "nuevos",            name: "Nuevos clientes",          rules: { estado: "nuevo" } },
  { code: "recurrentes",       name: "Recurrentes",              rules: { estado: "recurrente" } },
  { code: "vip",               name: "VIP",                      rules: { estado: "vip" } },
  { code: "abandonado",        name: "Con carrito abandonado",   rules: { estado: "carrito_abandonado" } },
  { code: "pendiente_pago",    name: "Pendientes de pago",       rules: { estado: "pendiente_pago" } },
  { code: "sin_comprar_30",    name: "Sin comprar 30+ días",     rules: { days_inactive_min: 30 } },
  { code: "sin_comprar_60",    name: "Sin comprar 60+ días",     rules: { days_inactive_min: 60 } },
  { code: "interes_proteinas", name: "Interés en proteínas",     rules: { interest: "proteinas" } },
  { code: "interes_colageno",  name: "Interés en colágeno",      rules: { interest: "colageno" } },
];

export default function CrmSegments() {
  const [segments, setSegments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: seg }, { data: cus }] = await Promise.all([
      (supabase as any).from("customer_segments").select("*").order("priority", { ascending: false }),
      (supabase as any).from("crm_customers").select("*"),
    ]);
    setSegments((seg || []) as any[]);
    setCustomers((cus || []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ensurePresets = async () => {
    for (const p of PRESETS) {
      if (segments.find((s) => s.code === p.code)) continue;
      await (supabase as any).from("customer_segments").insert({ code: p.code, name: p.name, rules: p.rules, priority: 1, is_active: true });
    }
    toast.success("Presets creados");
    load();
  };

  const matches = useMemo(() => {
    if (!selected) return [];
    return customers.filter((c) => matchRules(c, selected.rules));
  }, [selected, customers]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Segmentos</h1>
        <Button variant="outline" onClick={ensurePresets}><Plus className="mr-2 h-4 w-4" />Crear presets</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1"><CardContent className="space-y-2 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Segmentos</div>
            <ul className="space-y-1">
              {segments.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s)}
                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selected?.id === s.id ? "bg-muted font-semibold" : ""}`}
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-muted-foreground">{customers.filter((c) => matchRules(c, s.rules)).length}</span>
                  </button>
                </li>
              ))}
              {segments.length === 0 && <li className="text-sm text-muted-foreground">Sin segmentos. Usa "Crear presets".</li>}
            </ul>
          </CardContent></Card>

          <Card className="md:col-span-2"><CardContent className="p-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Selecciona un segmento para ver clientes.</p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">{selected.name}</div>
                    <div className="text-xs text-muted-foreground">{matches.length} clientes</div>
                  </div>
                  <ToggleActive segment={selected} onChange={(p) => setSelected({ ...selected, ...p })} />
                </div>
                <pre className="mb-3 rounded bg-muted p-2 text-xs">{JSON.stringify(selected.rules, null, 2)}</pre>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left"><tr>
                      <th className="px-2 py-1">Cliente</th><th className="px-2 py-1">Estado</th><th className="px-2 py-1">Pedidos</th>
                    </tr></thead>
                    <tbody>
                      {matches.map((c) => {
                        const est = (c.estado || "nuevo") as CrmEstado;
                        return (
                          <tr key={c.user_id} className="border-b">
                            <td className="px-2 py-1"><Link to={`/admin/crm/clientes/${c.user_id}`} className="hover:underline">{c.full_name || c.email}</Link></td>
                            <td className="px-2 py-1"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${ESTADO_BADGE[est]}`}>{ESTADO_LABEL[est]}</span></td>
                            <td className="px-2 py-1">{c.total_orders}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

function ToggleActive({ segment, onChange }: { segment: any; onChange: (p: any) => void }) {
  const toggle = async (v: boolean) => {
    await (supabase as any).from("customer_segments").update({ is_active: v }).eq("id", segment.id);
    onChange({ is_active: v });
  };
  return (
    <div className="flex items-center gap-2 text-xs">Activo <Switch checked={segment.is_active} onCheckedChange={toggle} /></div>
  );
}

function matchRules(c: any, r: any) {
  if (!r) return true;
  if (r.estado && c.estado !== r.estado) return false;
  if (typeof r.min_orders === "number" && Number(c.total_orders || 0) < r.min_orders) return false;
  if (typeof r.max_orders === "number" && Number(c.total_orders || 0) > r.max_orders) return false;
  if (typeof r.min_spent === "number" && Number(c.total_spent || 0) < r.min_spent) return false;
  if (typeof r.max_spent === "number" && Number(c.total_spent || 0) > r.max_spent) return false;
  if (typeof r.days_inactive_min === "number" && (c.days_since_last == null || c.days_since_last < r.days_inactive_min)) return false;
  if (typeof r.days_inactive_max === "number" && (c.days_since_last == null || c.days_since_last > r.days_inactive_max)) return false;
  if (r.interest && c.primary_interest !== r.interest) return false;
  if (r.city && (c.city || "").toLowerCase() !== String(r.city).toLowerCase()) return false;
  return true;
}
