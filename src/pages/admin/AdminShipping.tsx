import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const KEYS = [
  "shipping_free_threshold",
  "shipping_default_cost",
  "shipping_policy_intro",
  "shipping_policy_times_title",
  "shipping_policy_times",
  "shipping_policy_responsibility_title",
  "shipping_policy_responsibility",
  "shipping_policy_confirmation_title",
  "shipping_policy_confirmation",
  "shipping_providers_title",
] as const;

type Provider = {
  id: string;
  name: string;
  code: string | null;
  cost: number;
  estimated_days: string | null;
  zones: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

const empty: Omit<Provider, "id"> = {
  name: "", code: "", cost: 0, estimated_days: "", zones: "", notes: "",
  is_active: true, sort_order: 0,
};

const sb: any = supabase;

export default function AdminShipping() {
  // --- Site content (policy + costs) ---
  const [m, setM] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // --- Providers CRUD ---
  const [items, setItems] = useState<Provider[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [f, setF] = useState<any>(empty);
  const [savingP, setSavingP] = useState(false);

  const loadAll = async () => {
    const [{ data: kv }, { data: prov }] = await Promise.all([
      sb.from("site_content").select("key,value").in("key", KEYS as unknown as string[]),
      sb.from("shipping_providers").select("*").order("sort_order").order("name"),
    ]);
    const next: Record<string, string> = {};
    KEYS.forEach((k) => (next[k] = ""));
    (kv ?? []).forEach((r: any) => { next[r.key] = r.value ?? ""; });
    setM(next); setSaved(next);
    setItems((prov as Provider[]) ?? []);
  };
  useEffect(() => { loadAll(); }, []);

  const set = (k: string, v: string) => setM((p) => ({ ...p, [k]: v }));
  const dirty = KEYS.some((k) => (m[k] ?? "") !== (saved[k] ?? ""));

  const saveContent = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({ key: k, value: m[k] ?? "" }));
      const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Política y costos guardados");
      loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const openNew = () => { setEditing(null); setF(empty); setOpen(true); };
  const openEdit = (p: Provider) => { setEditing(p); setF(p); setOpen(true); };
  const setP = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  const saveProvider = async () => {
    if (!f.name?.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSavingP(true);
    const payload = { ...f, cost: Number(f.cost) || 0, sort_order: Number(f.sort_order) || 0 };
    delete payload.id;
    const res = editing
      ? await sb.from("shipping_providers").update(payload).eq("id", editing.id)
      : await sb.from("shipping_providers").insert(payload);
    setSavingP(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Transportista actualizado" : "Transportista creado");
    setOpen(false); loadAll();
  };

  const remove = async (p: Provider) => {
    if (!confirm(`¿Eliminar el transportista "${p.name}"?`)) return;
    const { error } = await sb.from("shipping_providers").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado"); loadAll();
  };

  const F = ({ k, label, area, type = "text" }: { k: string; label: string; area?: boolean; type?: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      {area ? (
        <Textarea className="mt-1.5" rows={3} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <Input className="mt-1.5" type={type} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Envíos</h1>
        <p className="text-sm text-muted-foreground">Gestiona costos, política de envío y transportistas.</p>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Costos de envío</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="shipping_default_cost" label="Costo de envío estándar (S/)" type="number" />
          <F k="shipping_free_threshold" label="Envío gratis a partir de (S/)" type="number" />
        </div>
        <p className="text-xs text-muted-foreground">Si el subtotal del pedido supera el umbral, el envío se calcula como gratis.</p>
      </div>

      <div className="rounded-lg border bg-background p-5 space-y-4">
        <h2 className="font-display text-lg">Política de envío</h2>
        <F k="shipping_policy_intro" label="Introducción" area />
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="shipping_policy_times_title" label="Título: Tiempos de entrega" />
          <F k="shipping_policy_times" label="Texto (una línea por viñeta)" area />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="shipping_policy_responsibility_title" label="Título: Responsabilidad" />
          <F k="shipping_policy_responsibility" label="Texto" area />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="shipping_policy_confirmation_title" label="Título: Confirmación" />
          <F k="shipping_policy_confirmation" label="Texto" area />
        </div>
        <F k="shipping_providers_title" label="Encabezado para la lista de transportistas (público)" />

        <div className="flex justify-end">
          <Button onClick={saveContent} disabled={!dirty || saving}>{saving ? "Guardando…" : "Guardar política y costos"}</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="font-display text-lg">Transportistas de envío</h2>
            <p className="text-sm text-muted-foreground">Empresas o couriers con los que despachas pedidos.</p>
          </div>
          <Button variant="dark" onClick={openNew}><Plus size={16} /> Nuevo transportista</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Tiempo estimado</TableHead>
              <TableHead>Zonas</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aún no hay transportistas.</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  {p.code && <div className="text-xs text-muted-foreground">{p.code}</div>}
                </TableCell>
                <TableCell>S/ {Number(p.cost).toFixed(2)}</TableCell>
                <TableCell>{p.estimated_days || "—"}</TableCell>
                <TableCell>{p.zones || "—"}</TableCell>
                <TableCell>{p.sort_order}</TableCell>
                <TableCell><Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Activo" : "Inactivo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transportista" : "Nuevo transportista"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={f.name ?? ""} onChange={(e) => setP("name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Código / slug</Label><Input value={f.code ?? ""} onChange={(e) => setP("code", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Costo (S/)</Label><Input type="number" step="0.1" value={f.cost ?? 0} onChange={(e) => setP("cost", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Tiempo estimado</Label><Input placeholder="2–5 días hábiles" value={f.estimated_days ?? ""} onChange={(e) => setP("estimated_days", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Zonas que cubre</Label><Input placeholder="Lima, provincias…" value={f.zones ?? ""} onChange={(e) => setP("zones", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Notas internas</Label><Textarea rows={2} value={f.notes ?? ""} onChange={(e) => setP("notes", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Orden</Label><Input type="number" value={f.sort_order ?? 0} onChange={(e) => setP("sort_order", e.target.value)} /></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={!!f.is_active} onCheckedChange={(v) => setP("is_active", v)} /><Label>Activo</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="dark" onClick={saveProvider} disabled={savingP}>{savingP ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
