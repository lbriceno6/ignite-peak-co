import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type InsightResponse = {
  question: string;
  window_days: number;
  datasets_used: string[];
  data_used: Record<string, unknown>;
  summary: string;
  key_findings: string[];
  recommendation: string;
  missing_data: string;
};

type ChatTurn = {
  id: string;
  question: string;
  pending: boolean;
  response?: InsightResponse;
  error?: string;
};

const PRESETS = [
  "¿Cuáles fueron los productos más vendidos en los últimos 30 días?",
  "¿Qué búsquedas no encuentran resultado?",
  "¿Cómo se está comportando el banner dinámico de intenciones?",
  "¿Cuántos eventos IA se están registrando esta semana?",
  "¿Dónde estoy perdiendo conversión en Home IA?",
];

export default function AdminIaInsights() {
  const [input, setInput] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, question: q, pending: true }]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { question: q, window_days: windowDays },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTurns((t) =>
        t.map((x) => (x.id === id ? { ...x, pending: false, response: data as InsightResponse } : x)),
      );
    } catch (e: any) {
      const msg = e?.message ?? "Error desconocido";
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, pending: false, error: msg } : x)));
      toast({ title: "No se pudo consultar IA", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Analítica IA conversacional</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Hazle preguntas en lenguaje natural a Lucía sobre ventas, búsquedas, intenciones y eventos IA.
          Las consultas son pre-validadas (no SQL libre) sobre <code>orders</code>, <code>order_items</code>,
          <code> lucia_events</code>, <code>purchase_intents</code> y <code>ai_block_toggles</code>.
        </p>
      </header>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Ventana:</span>
          {[7, 14, 30, 60, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
            >
              {d} días
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="secondary"
              className="text-xs"
              disabled={loading}
              onClick={() => ask(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {turns.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Empieza con una pregunta sobre el negocio o usa un preset arriba.
          </Card>
        )}
        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                {t.question}
              </div>
            </div>
            <Card className="p-4 space-y-3">
              {t.pending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Razonando con datos…
                </div>
              )}
              {t.error && <p className="text-sm text-destructive">{t.error}</p>}
              {t.response && (
                <>
                  <p className="text-sm">{t.response.summary}</p>
                  {t.response.key_findings?.length > 0 && (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {t.response.key_findings.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  )}
                  {t.response.recommendation && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm border-l-4 border-primary">
                      <strong className="block text-xs uppercase tracking-wide text-primary mb-1">
                        Recomendación
                      </strong>
                      {t.response.recommendation}
                    </div>
                  )}
                  {t.response.missing_data && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      ⚠ {t.response.missing_data}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.response.datasets_used.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Ver datos utilizados</summary>
                    <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 text-[10px]">
                      {JSON.stringify(t.response.data_used, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </Card>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <Card className="p-3 sticky bottom-4 shadow-lg">
        <form
          className="flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntale algo a la IA sobre tu tienda…"
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
