import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Save, Trash2 } from "lucide-react";

const sb: any = supabase;

type Redir = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  active: boolean;
  created_at?: string;
};

const empty: Partial<Redir> = { from_path: "", to_path: "", status_code: 301, active: true };

export default function RedirectsManager() {
  const [items, setItems] = useState<Redir[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Redir> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("seo_redirects")
      .select("id,from_path,to_path,status_code,active,created_at")
      .order("created_at", { ascending: false });
    setItems((data as Redir[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.from_path?.trim() || !editing?.to_path?.trim())
      return toast.error("Origen y destino obligatorios");
    if (!editing.from_path.startsWith("/") || !editing.to_path.startsWith("/"))
      return toast.error("Las rutas deben empezar con /");
    setSaving(true);
    const payload = {
      from_path: editing.from_path.trim(),
      to_path: editing.to_path.trim(),
      status_code: Number(editing.status_code) || 301,
      active: editing.active ?? true,
    };
    const res = editing.id
      ? await sb.from("seo_redirects").update(payload).eq("id", editing.id)
      : await sb.from("seo_redirects").upsert(payload, { onConflict: "from_path" });
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Guardado");
    setEditing(null);
    load();
  };

  const remove = async (r: Redir) => {
    if (!confirm(`Eliminar redirección ${r.from_path} → ${r.to_path}?`)) return;
    const { error } = await sb.from("seo_redirects").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    load();
  };

  const toggle = async (r: Redir) => {
    await sb.from("seo_redirects").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Redirecciones 301</CardTitle>
          <p className="text-xs text-muted-foreground">
            Las redirecciones creadas al cambiar slugs aparecen aquí automáticamente. También puedes crear redirecciones manuales.
          </p>
        </div>
        <Button variant="dark" size="sm" onClick={() => setEditing(empty)}>
          <Plus size={14} /> Nueva redirección
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-20 items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">URL anterior</th>
                  <th className="py-2 pr-3">URL nueva</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Creada</th>
                  <th className="py-2 pr-3">Activa</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3"><code className="text-xs">{r.from_path}</code></td>
                    <td className="py-2 pr-3"><code className="text-xs">{r.to_path}</code></td>
                    <td className="py-2 pr-3 text-xs">{r.status_code}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3"><Switch checked={r.active} onCheckedChange={() => toggle(r)} /></td>
                    <td className="py-2 pr-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 size={14} /></Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sin redirecciones.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nueva"} redirección 301</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>URL anterior</Label>
                <Input value={editing.from_path ?? ""} placeholder="/categoria/ruta-antigua"
                  onChange={(e) => setEditing((p) => ({ ...p!, from_path: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>URL nueva</Label>
                <Input value={editing.to_path ?? ""} placeholder="/categoria/ruta-nueva"
                  onChange={(e) => setEditing((p) => ({ ...p!, to_path: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Input type="number" value={editing.status_code ?? 301}
                    onChange={(e) => setEditing((p) => ({ ...p!, status_code: Number(e.target.value) }))} />
                </div>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p!, active: v }))} /> Activa
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
