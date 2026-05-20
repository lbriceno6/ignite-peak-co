import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

type Syn = { id: string; term: string; hits: number; status: string; suggested_target_kind: string | null; suggested_target_id: string | null; resolved_to: string | null };
type Product = { id: string; name: string; slug: string };

export function SynonymsTab() {
  const [rows, setRows] = useState<Syn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: syns }, { data: prods }] = await Promise.all([
      supabase.from("seo_synonyms" as any).select("*").order("hits", { ascending: false }).limit(200),
      supabase.from("products").select("id, name, slug").order("name").limit(500),
    ]);
    setRows(((syns as any[]) ?? []) as Syn[]);
    setProducts((prods ?? []) as Product[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const mapTo = async (s: Syn) => {
    const productId = targets[s.id];
    if (!productId) { toast.error("Selecciona un producto"); return; }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const { error: e1 } = await supabase.from("product_search_terms").insert({
      product_id: p.id, term: s.term, weight: 1.5, kind: "synonym",
    });
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("seo_synonyms" as any).update({ status: "mapped", resolved_to: p.slug }).eq("id", s.id);
    toast.success(`"${s.term}" → ${p.name}`);
    load();
  };

  const ignore = async (s: Syn) => {
    await supabase.from("seo_synonyms" as any).update({ status: "ignored" }).eq("id", s.id);
    load();
  };

  if (loading) return <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Cargando…</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Términos buscados que no encontraron resultados. Asocia cada uno a un producto para mejorar el buscador interno.</p>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Término</th><th className="p-3">Hits</th><th className="p-3">Estado</th><th className="p-3">Asociar a producto</th><th className="p-3 text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.term}</td>
                <td className="p-3">{s.hits}</td>
                <td className="p-3"><Badge variant={s.status === "mapped" ? "outline" : s.status === "ignored" ? "secondary" : "destructive"}>{s.status}</Badge>{s.resolved_to && <span className="ml-2 text-xs text-muted-foreground">→ {s.resolved_to}</span>}</td>
                <td className="p-3">
                  {s.status === "pending" && (
                    <select
                      value={targets[s.id] ?? ""}
                      onChange={(e) => setTargets((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="w-full max-w-xs rounded border bg-background px-2 py-1 text-sm"
                    >
                      <option value="">— elegir —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {s.status === "pending" && (
                    <>
                      <Button size="sm" variant="dark" onClick={() => mapTo(s)}><Check size={12} /> Asociar</Button>
                      <Button size="sm" variant="ghost" onClick={() => ignore(s)}><X size={12} /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin sugerencias por ahora</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
