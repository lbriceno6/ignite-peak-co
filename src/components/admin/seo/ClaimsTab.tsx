import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Rule = { id: string; pattern: string; severity: string; suggestion: string; is_active: boolean };

export function ClaimsTab() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [pattern, setPattern] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [severity, setSeverity] = useState<"high" | "medium" | "low">("high");

  const load = async () => {
    const { data } = await supabase.from("sensitive_claims_rules" as any).select("*").order("severity").order("pattern");
    setRows(((data as any[]) ?? []) as Rule[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!pattern || !suggestion) return;
    const { error } = await supabase.from("sensitive_claims_rules" as any).insert({ pattern: pattern.trim().toLowerCase(), suggestion, severity });
    if (error) toast.error(error.message);
    else { setPattern(""); setSuggestion(""); load(); }
  };
  const del = async (id: string) => { await supabase.from("sensitive_claims_rules" as any).delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Términos prohibidos que se marcan como claims médicos. El editor SEO sugiere automáticamente los reemplazos.</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-background p-4">
        <div className="flex-1 min-w-[160px]"><label className="text-xs text-muted-foreground">Patrón</label><Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="cura el cáncer" /></div>
        <div className="flex-1 min-w-[160px]"><label className="text-xs text-muted-foreground">Sugerencia</label><Input value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="producto alimenticio natural" /></div>
        <div><label className="text-xs text-muted-foreground">Severidad</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="block w-full rounded border bg-background px-2 py-2 text-sm">
            <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
          </select>
        </div>
        <Button variant="dark" onClick={add}><Plus size={14} /> Agregar</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="p-3">Patrón</th><th className="p-3">Severidad</th><th className="p-3">Sugerencia</th><th className="p-3 text-right"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.pattern}</td>
                <td className="p-3"><Badge variant={r.severity === "high" ? "destructive" : "outline"}>{r.severity}</Badge></td>
                <td className="p-3 text-muted-foreground">{r.suggestion}</td>
                <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 size={14} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
