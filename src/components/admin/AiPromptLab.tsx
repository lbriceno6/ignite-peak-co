// Phase 9 — Prompt Lab
// Lets admins edit the system prompt of each AI edge function, save it as a
// new active version (the trigger auto-deactivates previous ones), view
// version history, and run a quick smoke-test against the function with a
// sample payload.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Play, RotateCcw, History, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type FnDef = {
  name: string;
  label: string;
  description: string;
  samplePayload: Record<string, any>;
};

const FUNCTIONS: FnDef[] = [
  {
    name: "ai-cart-recommendations",
    label: "Recomendaciones de carrito",
    description: "Sugiere productos complementarios cuando hay artículos en el carrito.",
    samplePayload: {
      cart: [{ slug: "proteina-whey", name: "Proteína Whey", category: "Proteínas", quantity: 1 }],
      catalog: [
        { slug: "creatina-monohidrato", name: "Creatina Monohidrato", category: "Performance", price: 60 },
        { slug: "shaker", name: "Shaker", category: "Accesorios", price: 15 },
      ],
      free_shipping_gap: 25,
      intent_slug: "musculo",
      max: 3,
    },
  },
  {
    name: "ai-product-related",
    label: "Productos relacionados (ficha)",
    description: "Genera productos cross-sell en la ficha de producto.",
    samplePayload: {
      product: { slug: "proteina-whey", name: "Proteína Whey", category: "Proteínas" },
      catalog: [
        { slug: "creatina-monohidrato", name: "Creatina Monohidrato", category: "Performance", price: 60 },
        { slug: "bcaa", name: "BCAA", category: "Aminoácidos", price: 50 },
      ],
      intent_slug: "musculo",
      intent_name: "Ganar músculo",
      max: 3,
    },
  },
  {
    name: "ai-post-purchase",
    label: "Insights post-compra",
    description: "Mensaje de agradecimiento + recordatorio de re-pedido + próximos pasos.",
    samplePayload: {
      order_code: "TEST-0001",
      items: [{ slug: "proteina-whey", name: "Proteína Whey", category: "Proteínas", quantity: 1 }],
      catalog: [
        { slug: "creatina-monohidrato", name: "Creatina Monohidrato", category: "Performance", price: 60 },
      ],
      intent_slug: "musculo",
      intent_name: "Ganar músculo",
      max: 3,
    },
  },
];

type Version = {
  id: string;
  function_name: string;
  system_prompt: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export function AiPromptLab() {
  const [fnName, setFnName] = useState<string>(FUNCTIONS[0].name);
  const [versions, setVersions] = useState<Version[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [optimizing, setOptimizing] = useState(false);
  const [suggestion, setSuggestion] = useState<{ prompt: string; rationale: string; metrics: any } | null>(null);

  const def = useMemo(() => FUNCTIONS.find((f) => f.name === fnName)!, [fnName]);
  const activeVersion = useMemo(() => versions.find((v) => v.is_active) ?? null, [versions]);

  const reload = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("ai_prompt_versions")
      .select("*")
      .eq("function_name", fnName)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Version[];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    setPrompt(active?.system_prompt ?? "");
    setNotes("");
    setLoading(false);
  };

  useEffect(() => { reload(); }, [fnName]);

  const saveAsActive = async () => {
    if (!prompt.trim()) { toast.error("El prompt no puede estar vacío"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("ai_prompt_versions").insert({
      function_name: fnName,
      system_prompt: prompt,
      notes: notes || null,
      is_active: true,
      created_by: u?.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Nueva versión activada");
    reload();
  };

  const activate = async (id: string) => {
    const { error } = await (supabase as any)
      .from("ai_prompt_versions")
      .update({ is_active: true })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Versión activada");
    reload();
  };

  const restoreDefault = () => {
    setPrompt("");
    setNotes("(restaurar al prompt por defecto del código)");
    toast.info("Borra y guarda para que la edge function use el prompt por defecto del código.");
  };

  const runTest = async () => {
    setRunning(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body: def.samplePayload });
      if (error) { setOutput(`ERROR: ${error.message}`); }
      else { setOutput(JSON.stringify(data, null, 2)); }
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message ?? String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const optimizeWithAi = async () => {
    setOptimizing(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-prompt-optimizer", {
        body: { function_name: fnName },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSuggestion({
        prompt: (data as any).suggested_prompt ?? "",
        rationale: (data as any).rationale ?? "",
        metrics: (data as any).metrics_used ?? {},
      });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar sugerencia");
    } finally {
      setOptimizing(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setPrompt(suggestion.prompt);
    setNotes(`Sugerido por IA — CVR base ${suggestion.metrics?.cvr_pct ?? 0}%`);
    setSuggestion(null);
    toast.success("Pegado en el editor — revisa y guarda para activar");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Función IA</CardTitle>
          <CardDescription>
            Elige una función para editar su system prompt. Al guardar se crea una nueva versión activa
            y la edge function la cargará automáticamente en la próxima llamada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={fnName} onValueChange={setFnName}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FUNCTIONS.map((f) => (
                <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{def.description}</p>
          {activeVersion ? (
            <Badge variant="default">Versión activa del {new Date(activeVersion.created_at).toLocaleString()}</Badge>
          ) : (
            <Badge variant="secondary">Sin override — usando prompt por defecto del código</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System prompt</CardTitle>
          <CardDescription>
            Si lo dejas vacío y guardas, la edge function volverá al prompt por defecto del código.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            placeholder="Pega aquí el system prompt…"
            className="font-mono text-xs"
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional) — qué cambiaste y por qué"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveAsActive} disabled={loading}>
              <Save size={14} className="mr-1" /> Guardar como nueva versión activa
            </Button>
            <Button variant="outline" onClick={restoreDefault}>
              <RotateCcw size={14} className="mr-1" /> Restaurar al default
            </Button>
            <Button variant="secondary" onClick={runTest} disabled={running}>
              <Play size={14} className="mr-1" /> {running ? "Ejecutando…" : "Probar con payload de muestra"}
            </Button>
            <Button variant="outline" onClick={optimizeWithAi} disabled={optimizing}>
              <Wand2 size={14} className="mr-1" /> {optimizing ? "Analizando métricas…" : "Sugerir mejora con IA"}
            </Button>
          </div>
          {output && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
              {output}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History size={16} /> Historial de versiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay versiones guardadas.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                      {v.notes && <p className="text-sm">{v.notes}</p>}
                      <p className="mt-1 line-clamp-2 text-xs font-mono text-muted-foreground">{v.system_prompt}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {v.is_active ? (
                        <Badge>Activa</Badge>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => activate(v.id)}>Activar</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setPrompt(v.system_prompt); setNotes(`Basado en versión ${new Date(v.created_at).toLocaleString()}`); }}>
                        Cargar
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!suggestion} onOpenChange={(o) => !o && setSuggestion(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 size={16} /> Sugerencia de prompt</DialogTitle>
            <DialogDescription>
              Generada a partir de los últimos 30 días: {suggestion?.metrics?.total_clicks ?? 0} clicks,{" "}
              {suggestion?.metrics?.attributed_orders ?? 0} pedidos atribuidos, CVR {suggestion?.metrics?.cvr_pct ?? 0}%.
            </DialogDescription>
          </DialogHeader>
          {suggestion && (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Razonamiento</p>
                <pre className="max-h-40 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">{suggestion.rationale}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nuevo system prompt</p>
                <Textarea value={suggestion.prompt} onChange={(e) => setSuggestion({ ...suggestion, prompt: e.target.value })} rows={14} className="font-mono text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestion(null)}>Descartar</Button>
            <Button onClick={applySuggestion}>Pegar en el editor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
