// Fase 21 — Admin UI: AI-driven SEO optimization for product listings.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminProductSeoAi() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const loadData = async () => {
    const [{ data: m }, { data: s }] = await Promise.all([
      (supabase as any).from("product_seo_metrics")
        .select("*, products(name, slug)")
        .order("ctr", { ascending: true })
        .limit(50),
      (supabase as any).from("ai_product_seo_log")
        .select("*, products(name, slug)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setMetrics(m ?? []);
    setSuggestions(s ?? []);
  };
  useEffect(() => { loadData(); }, []);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-seo-optimize", {
        body: { action: "analyze", window_days: windowDays },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Analizados ${(data as any).total} productos`);
      await loadData();
    } catch (e: any) { toast.error(e?.message ?? "Error"); } finally { setLoading(false); }
  };

  const suggest = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-seo-optimize", {
        body: { action: "suggest", window_days: windowDays, limit: 5 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sugerencias generadas para ${(data as any).generated} productos`);
      await loadData();
    } catch (e: any) { toast.error(e?.message ?? "Error"); } finally { setGenerating(false); }
  };

  const apply = async (logId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-seo-optimize", {
        body: { action: "apply", log_id: logId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Aplicado");
      await loadData();
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Optimización IA de fichas</h1>
      </div>
      <p className="text-muted-foreground">
        La IA analiza CTR y conversión por producto y propone mejoras de título, descripción, meta y alt-text.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
          <CardDescription>Ventana de análisis: últimos {windowDays} días</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Recalcular métricas
          </Button>
          <Button onClick={suggest} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Sugerir mejoras (top 5 bajo CTR)
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Sugerencias IA</TabsTrigger>
          <TabsTrigger value="metrics">Métricas por producto</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="pt-4">
          <Card>
            <CardContent className="p-0">
              {suggestions.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aún no hay sugerencias. Pulsa "Sugerir mejoras".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Antes</TableHead>
                      <TableHead>Después</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-[180px] truncate font-medium">{s.products?.name ?? s.product_id}</TableCell>
                        <TableCell><Badge variant="outline">{s.field}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{s.before_value ?? "—"}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs">{s.after_value}</TableCell>
                        <TableCell className="text-xs">{((s.ctr_before ?? 0) * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-xs">{s.ai_score ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {s.applied ? (
                            <Badge variant="default"><Check size={12} className="mr-1" />Aplicado</Badge>
                          ) : (
                            <Button size="sm" onClick={() => apply(s.id)}>Aplicar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="pt-4">
          <Card>
            <CardContent className="p-0">
              {metrics.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Sin métricas todavía. Pulsa "Recalcular métricas".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Vistas</TableHead>
                      <TableHead className="text-right">Carrito</TableHead>
                      <TableHead className="text-right">Compras</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => (
                      <TableRow key={m.product_id}>
                        <TableCell className="max-w-[260px] truncate font-medium">{m.products?.name ?? m.product_id}</TableCell>
                        <TableCell className="text-right">{m.views}</TableCell>
                        <TableCell className="text-right">{m.add_to_cart}</TableCell>
                        <TableCell className="text-right">{m.purchases}</TableCell>
                        <TableCell className="text-right">{(m.ctr * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{(m.conversion_rate * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
