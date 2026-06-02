import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

type Segment = { id: string; code: string; name: string; description: string | null; is_active: boolean };
type Rule = {
  id: string;
  segment_id: string;
  scope: string;
  target_value: string | null;
  discount_percent: number;
  message: string | null;
  priority: number;
  is_active: boolean;
  ai_generated: boolean;
};

export const AiDynamicPricing = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [draft, setDraft] = useState<Partial<Rule>>({ scope: "global", discount_percent: 10, priority: 10, is_active: true });

  const load = async () => {
    setLoading(true);
    const [{ data: segs }, { data: rs }] = await Promise.all([
      sb.from("customer_segments").select("*").order("priority"),
      sb.from("dynamic_pricing_rules").select("*").order("priority", { ascending: false }),
    ]);
    setSegments(segs ?? []);
    setRules(rs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft.segment_id) { toast.error("Selecciona un segmento"); return; }
    const { error } = await sb.from("dynamic_pricing_rules").insert({
      segment_id: draft.segment_id,
      scope: draft.scope ?? "global",
      target_value: draft.target_value || null,
      discount_percent: Number(draft.discount_percent ?? 0),
      message: draft.message || null,
      priority: Number(draft.priority ?? 0),
      is_active: draft.is_active ?? true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Regla creada");
    setDraft({ scope: "global", discount_percent: 10, priority: 10, is_active: true });
    load();
  };

  const toggle = async (r: Rule) => {
    await sb.from("dynamic_pricing_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar regla?")) return;
    await sb.from("dynamic_pricing_rules").delete().eq("id", id);
    load();
  };

  const suggest = async () => {
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke("ai-dynamic-pricing", {
      body: { action: "suggest", context: { brand: "Nutribatidos", focus: "retención y ticket promedio" } },
    });
    setSuggesting(false);
    if (error) { toast.error("No se pudieron generar sugerencias"); return; }
    const sugs = (data as any)?.suggestions ?? [];
    if (!sugs.length) { toast.warning("La IA no devolvió sugerencias"); return; }
    const toInsert = sugs
      .map((s: any) => {
        const seg = segments.find((sg) => sg.code === s.segment_code);
        if (!seg) return null;
        return {
          segment_id: seg.id,
          scope: s.scope ?? "global",
          target_value: s.target_value ?? null,
          discount_percent: Number(s.discount_percent ?? 0),
          message: s.message ?? null,
          priority: Number(s.priority ?? 5),
          ai_generated: true,
          is_active: false,
        };
      })
      .filter(Boolean);
    if (toInsert.length) {
      await sb.from("dynamic_pricing_rules").insert(toInsert);
      toast.success(`${toInsert.length} reglas sugeridas (inactivas)`);
      load();
    }
  };

  const segName = (id: string) => segments.find((s) => s.id === id)?.name ?? "—";

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg">Reglas activas</h3>
            <p className="text-sm text-muted-foreground">Descuentos dinámicos aplicados por segmento de cliente.</p>
          </div>
          <Button onClick={suggest} disabled={suggesting} variant="outline">
            {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Sugerir reglas IA
          </Button>
        </div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
              <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "ON" : "OFF"}</Badge>
              {r.ai_generated && <Badge variant="outline" className="text-xs">IA</Badge>}
              <span className="font-semibold">{segName(r.segment_id)}</span>
              <span className="text-sm text-muted-foreground">{r.scope}{r.target_value ? ` · ${r.target_value}` : ""}</span>
              <span className="text-sm font-semibold text-accent">{r.discount_percent}%</span>
              <span className="flex-1 truncate text-sm text-muted-foreground">{r.message}</span>
              <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {!rules.length && <p className="text-sm text-muted-foreground">Sin reglas todavía.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-display text-lg">Nueva regla</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Segmento</Label>
            <Select value={draft.segment_id} onValueChange={(v) => setDraft({ ...draft, segment_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona segmento" /></SelectTrigger>
              <SelectContent>
                {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alcance</Label>
            <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="category">Categoría</SelectItem>
                <SelectItem value="brand">Marca</SelectItem>
                <SelectItem value="product">Producto (slug)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.scope !== "global" && (
            <div>
              <Label>Valor objetivo</Label>
              <Input value={draft.target_value ?? ""} onChange={(e) => setDraft({ ...draft, target_value: e.target.value })} placeholder="ej. Superalimentos / nutribatidos / maca-premium" />
            </div>
          )}
          <div>
            <Label>Descuento %</Label>
            <Input type="number" value={draft.discount_percent} onChange={(e) => setDraft({ ...draft, discount_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Prioridad</Label>
            <Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Mensaje al cliente</Label>
            <Input value={draft.message ?? ""} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Te damos 10% por ser cliente recurrente" />
          </div>
        </div>
        <Button onClick={save} className="mt-4">Crear regla</Button>
      </Card>
    </div>
  );
};

export default AiDynamicPricing;
