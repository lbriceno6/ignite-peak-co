import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus, RotateCcw, Eye, EyeOff } from "lucide-react";
import { ICON_OPTIONS, DEFAULT_BENEFITS, type ProductBenefit } from "@/hooks/useProductBenefits";
import { renderBenefitIcon } from "@/components/BenefitIcon";

const MAX = 4;

export default function AdminBenefits() {
  const [items, setItems] = useState<ProductBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("product_benefits" as any).select("*").order("sort_order");
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<ProductBenefit>) =>
    setItems((p) => p.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const move = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === id);
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next.map((b, i) => ({ ...b, sort_order: i + 1 })));
  };

  const addNew = () => {
    if (items.length >= MAX) return toast.error(`Máximo ${MAX} beneficios visibles`);
    const draft: ProductBenefit = {
      id: `tmp-${crypto.randomUUID()}`,
      icon: "truck",
      title: "",
      subtitle: "",
      is_active: true,
      sort_order: items.length + 1,
    };
    setItems([...items, draft]);
  };

  const removeItem = async (id: string) => {
    if (id.startsWith("tmp-")) return setItems(items.filter((b) => b.id !== id));
    const { error } = await supabase.from("product_benefits" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Beneficio eliminado");
    load();
  };

  const toggleAll = async (active: boolean) => {
    setItems(items.map((b) => ({ ...b, is_active: active })));
  };

  const restoreDefaults = async () => {
    if (!confirm("¿Restaurar los beneficios por defecto? Esto reemplazará los actuales.")) return;
    setSaving(true);
    const { error: delErr } = await supabase.from("product_benefits" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) { setSaving(false); return toast.error(delErr.message); }
    const { error } = await supabase.from("product_benefits" as any).insert(DEFAULT_BENEFITS as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Valores por defecto restaurados");
    load();
  };

  const saveAll = async () => {
    for (const b of items) {
      if (!b.title.trim()) return toast.error("Todos los beneficios necesitan un texto principal");
    }
    if (items.length > MAX) return toast.error(`Máximo ${MAX} beneficios`);
    setSaving(true);
    try {
      for (const b of items) {
        const payload = {
          icon: b.icon, title: b.title.trim(),
          subtitle: b.subtitle?.trim() || null,
          is_active: b.is_active, sort_order: b.sort_order,
        };
        if (b.id.startsWith("tmp-")) {
          const { error } = await supabase.from("product_benefits" as any).insert(payload as any);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("product_benefits" as any).update(payload).eq("id", b.id);
          if (error) throw error;
        }
      }
      toast.success("Beneficios guardados");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Beneficios de compra</h1>
        <p className="text-muted-foreground">
          Edita los mensajes de confianza que aparecen en la ficha de cada producto. Máximo {MAX} visibles.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addNew} disabled={items.length >= MAX}>
          <Plus size={14} /> Agregar beneficio
        </Button>
        <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
          <Eye size={14} /> Activar todos
        </Button>
        <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
          <EyeOff size={14} /> Desactivar todos
        </Button>
        <Button variant="outline" size="sm" onClick={restoreDefaults} disabled={saving}>
          <RotateCcw size={14} /> Restaurar valores por defecto
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No hay beneficios. Agrega uno o restaura los valores por defecto.
            </p>
          )}
          {items.map((b, i) => (
            <div key={b.id} className={`rounded-lg border bg-background p-4 ${!b.is_active ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">#{i + 1}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    {renderBenefitIcon(b.icon as string, 18)}
                  </div>
                </div>

                <div className="grid flex-1 min-w-[260px] gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Icono</Label>
                    <Select value={b.icon as string} onValueChange={(v) => update(b.id, { icon: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Texto principal</Label>
                    <Input value={b.title} maxLength={80} onChange={(e) => update(b.id, { title: e.target.value })} placeholder="Ej. Envío gratis sobre S/ 50.00" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Texto secundario (opcional)</Label>
                    <Input value={b.subtitle ?? ""} maxLength={120} onChange={(e) => update(b.id, { subtitle: e.target.value })} placeholder="Ej. Entrega 1–3 días" />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{b.is_active ? "Activo" : "Inactivo"}</span>
                    <Switch checked={b.is_active} onCheckedChange={(v) => update(b.id, { is_active: v })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => move(b.id, -1)} disabled={i === 0}><ArrowUp size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => move(b.id, 1)} disabled={i === items.length - 1}><ArrowDown size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(b.id)}><Trash2 size={16} className="text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={load} disabled={saving}>Descartar</Button>
        <Button variant="dark" onClick={saveAll} disabled={saving || loading}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
