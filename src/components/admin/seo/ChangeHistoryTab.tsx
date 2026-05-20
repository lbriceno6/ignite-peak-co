import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Log = {
  id: string; entity_type: string; entity_id: string | null;
  field_changed: string; old_value: string | null; new_value: string | null;
  changed_by: string | null; changed_at: string;
};

export function ChangeHistoryTab() {
  const [rows, setRows] = useState<Log[]>([]);
  const [filter, setFilter] = useState({ entity: "", field: "" });

  useEffect(() => {
    let q = supabase.from("seo_change_logs" as any)
      .select("*").order("changed_at", { ascending: false }).limit(300);
    if (filter.entity) q = q.eq("entity_type", filter.entity);
    if (filter.field) q = q.ilike("field_changed", `%${filter.field}%`);
    q.then(({ data }) => setRows((data as any[]) ?? []));
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select className="block h-9 rounded-md border bg-background px-2 text-sm"
            value={filter.entity} onChange={(e) => setFilter({ ...filter, entity: e.target.value })}>
            <option value="">Todos</option>
            <option value="product">product</option>
            <option value="category">category</option>
            <option value="blog">blog</option>
            <option value="landing">landing</option>
            <option value="redirect">redirect</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Campo</label>
          <Input value={filter.field} onChange={(e) => setFilter({ ...filter, field: e.target.value })} className="w-48" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Entidad</th>
              <th className="p-3">Campo</th><th className="p-3">Antes</th>
              <th className="p-3">Después</th><th className="p-3">Autor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.changed_at).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{r.entity_type}</Badge><div className="text-[10px] text-muted-foreground">{r.entity_id?.slice(0, 8)}</div></td>
                <td className="p-3 font-mono text-xs">{r.field_changed}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-[220px] truncate" title={r.old_value ?? ""}>{r.old_value ?? "—"}</td>
                <td className="p-3 text-xs max-w-[220px] truncate" title={r.new_value ?? ""}>{r.new_value ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.changed_by?.slice(0, 8) ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sin cambios registrados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
