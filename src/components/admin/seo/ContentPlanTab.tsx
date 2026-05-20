import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

const KINDS = ["blog", "landing", "faq", "product_improvement", "synonym", "internal_link"] as const;
const STATUSES = ["draft", "review", "approved", "published"] as const;

export function ContentPlanTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ kind: "blog", title: "", target_keyword: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("seo_content_plan" as any).select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title.trim()) return toast.error("Falta título");
    const { error } = await supabase.from("seo_content_plan" as any).insert({ ...form, status: "draft" });
    if (error) return toast.error(error.message);
    setForm({ kind: "blog", title: "", target_keyword: "", notes: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("seo_content_plan" as any).update({ status }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("seo_content_plan" as any).delete().eq("id", id);
    load();
  };

  const generateMonthly = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-monthly-plan", { body: {} });
      if (error || (data as any)?.error) throw new Error(error?.message ?? (data as any).error);
      toast.success(`Se generaron ${(data as any).inserted ?? 0} ítems en estado borrador`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setGenerating(false); }
  };

  const byStatus = (s: string) => rows.filter((r) => r.status === s);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Planifica artículos, landings, FAQs, sinónimos y enlaces internos.</p>
        <Button variant="dark" onClick={generateMonthly} disabled={generating}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generar plan SEO mensual
        </Button>
      </div>

      <div className="grid gap-2 rounded-lg border bg-background p-3 md:grid-cols-[140px_1fr_180px_auto]">
        <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Keyword objetivo" value={form.target_keyword} onChange={(e) => setForm({ ...form, target_keyword: e.target.value })} />
        <Button onClick={add}><Plus size={14} /> Añadir</Button>
        <Textarea className="md:col-span-4" rows={2} placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>

      {loading ? <p className="text-muted-foreground"><Loader2 size={14} className="inline animate-spin" /> Cargando…</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-lg border bg-background">
              <div className="border-b p-3 text-sm font-semibold capitalize">{s} <Badge variant="outline" className="ml-2">{byStatus(s).length}</Badge></div>
              <ul className="max-h-[520px] divide-y overflow-auto">
                {byStatus(s).map((r) => (
                  <li key={r.id} className="space-y-2 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.kind}{r.target_keyword ? ` · ${r.target_keyword}` : ""}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                    </div>
                    {r.notes && <p className="text-xs text-muted-foreground line-clamp-3">{r.notes}</p>}
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </li>
                ))}
                {byStatus(s).length === 0 && <li className="p-6 text-center text-xs text-muted-foreground">Vacío</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
