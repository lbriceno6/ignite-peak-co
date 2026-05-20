import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function RedirectsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ from_path: "", to_path: "", status_code: 301 });

  const load = async () => {
    const { data } = await supabase.from("seo_redirects" as any).select("*").order("created_at", { ascending: false });
    setRows((data as any[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.from_path.startsWith("/") || !form.to_path.startsWith("/")) return toast.error("Las rutas deben empezar con /");
    const { error } = await supabase.from("seo_redirects" as any).insert({ ...form, active: true });
    if (error) return toast.error(error.message);
    setForm({ from_path: "", to_path: "", status_code: 301 });
    load();
  };

  const toggle = async (id: string, active: boolean) => { await supabase.from("seo_redirects" as any).update({ active }).eq("id", id); load(); };
  const remove = async (id: string) => { await supabase.from("seo_redirects" as any).delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Redirecciones aplicadas en el frontend (equivalente UX a 301). Útil cuando cambias slugs.</p>
      <div className="grid gap-2 rounded-lg border bg-background p-3 md:grid-cols-[1fr_1fr_120px_auto]">
        <Input placeholder="/url-antigua" value={form.from_path} onChange={(e) => setForm({ ...form, from_path: e.target.value })} />
        <Input placeholder="/url-nueva" value={form.to_path} onChange={(e) => setForm({ ...form, to_path: e.target.value })} />
        <Select value={String(form.status_code)} onValueChange={(v) => setForm({ ...form, status_code: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="301">301</SelectItem><SelectItem value="302">302</SelectItem></SelectContent>
        </Select>
        <Button onClick={add}><Plus size={14} /> Añadir</Button>
      </div>

      <div className="rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Desde</th><th className="p-3">A</th><th className="p-3">Código</th><th className="p-3">Activa</th><th className="p-3"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono text-xs">{r.from_path}</td>
                <td className="p-3 font-mono text-xs">{r.to_path}</td>
                <td className="p-3">{r.status_code}</td>
                <td className="p-3"><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} /></td>
                <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 size={14} /></Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin redirecciones</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
