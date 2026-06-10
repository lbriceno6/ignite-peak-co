import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function CrmTemplates() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("crm_message_templates").select("*").order("name");
    setRows((data || []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing?.body) return toast.error("Nombre y mensaje son obligatorios");
    const payload = { name: editing.name, category: editing.category || null, body: editing.body, is_active: editing.is_active ?? true, channel: editing.channel || "whatsapp" };
    if (editing.id) {
      const { error } = await (supabase as any).from("crm_message_templates").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from("crm_message_templates").insert(payload);
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar plantilla?")) return;
    await (supabase as any).from("crm_message_templates").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plantillas de mensajes</h1>
        <Button onClick={() => setEditing({ channel: "whatsapp", is_active: true })}><Plus className="mr-2 h-4 w-4" />Nueva</Button>
      </div>

      {editing && (
        <Card><CardContent className="space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Nombre" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Categoría" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
          </div>
          <Textarea rows={5} placeholder="Mensaje · usa {{nombre}}, {{producto}}, {{link}}, {{order_code}}, {{tracking}}, {{cupon}}, {{interes}}" value={editing.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          <div className="flex items-center gap-2 text-sm"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Activa</div>
          <div className="flex gap-2"><Button onClick={save}>Guardar</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button></div>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr>
              <th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Categoría</th><th className="px-3 py-2">Cuerpo</th><th className="px-3 py-2">Activa</th><th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.category || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground line-clamp-2">{r.body}</td>
                  <td className="px-3 py-2 text-xs">{r.is_active ? "Sí" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}
