import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: any[];
  onDone: () => void;
};

type FieldKey =
  | "seo_title" | "seo_description" | "slug" | "canonical" | "og_image"
  | "keywords" | "tags" | "shopping_title" | "shopping_description"
  | "short_description" | "long_description" | "image_alts" | "noindex";

const FIELD_OPTIONS: { key: FieldKey; label: string; mainCopy?: boolean }[] = [
  { key: "seo_title", label: "Título SEO (meta title)" },
  { key: "seo_description", label: "Meta descripción" },
  { key: "slug", label: "Slug SEO" },
  { key: "canonical", label: "Canonical URL" },
  { key: "og_image", label: "Imagen OG" },
  { key: "keywords", label: "Palabras clave" },
  { key: "tags", label: "Tags" },
  { key: "shopping_title", label: "Título Google Shopping" },
  { key: "shopping_description", label: "Descripción Google Shopping" },
  { key: "image_alts", label: "Alt text de imágenes" },
  { key: "noindex", label: "Quitar no-index si está completo" },
  { key: "short_description", label: "Descripción corta visible (avanzado)", mainCopy: true },
  { key: "long_description", label: "Descripción larga visible (avanzado)", mainCopy: true },
];

type Row = {
  id: string;
  name: string;
  status: "pending" | "running" | "ok" | "error";
  provider?: string;
  score?: number;
  completed?: number;
  complete?: boolean;
  error?: string;
  warnings?: string[];
  before?: { title: number; desc: number };
  after?: { title: number; desc: number };
};

export function BulkSeoAiDialog({ open, onOpenChange, products, onDone }: Props) {
  const [provider, setProvider] = useState<"openai" | "deepseek" | "lovable">("openai");
  const [level, setLevel] = useState<"basico" | "equilibrado" | "avanzado">("equilibrado");
  const [overwrite, setOverwrite] = useState(false);
  const [fixOutOfRange, setFixOutOfRange] = useState(true);
  const [improveMain, setImproveMain] = useState(false);
  const [skipComplete, setSkipComplete] = useState(true);
  const [fields, setFields] = useState<Record<FieldKey, boolean>>(() =>
    Object.fromEntries(FIELD_OPTIONS.map((o) => [o.key, !o.mainCopy])) as any,
  );
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);

  const completeCount = products.filter((p: any) => p.__seo_status === "complete").length;
  const effectiveTargets = skipComplete
    ? products.filter((p: any) => p.__seo_status !== "complete")
    : products;

  useEffect(() => {
    if (!open) return;
    setRows(effectiveTargets.map((p) => ({ id: p.id, name: p.name, status: "pending" })));
    setDone(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, products, skipComplete]);

  const total = effectiveTargets.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const runWith = async (extraBody: Record<string, any>) => {
    setRunning(true);
    setDone(0);
    let selectedFields = (Object.keys(fields) as FieldKey[]).filter((k) => fields[k]);
    if (!improveMain) {
      selectedFields = selectedFields.filter((f) => f !== "short_description" && f !== "long_description");
    }
    const targets = effectiveTargets;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      updateRow(p.id, { status: "running" });
      try {
        const { data, error } = await supabase.functions.invoke("product-seo-generate", {
          body: {
            product_id: p.id,
            provider,
            level,
            overwrite_existing: overwrite,
            fix_out_of_range: fixOutOfRange,
            improve_main: improveMain,
            fields_to_generate: selectedFields,
            ...extraBody,
          },
        });
        if (error) {
          updateRow(p.id, {
            status: "error",
            error: `[${provider}] product-seo-generate · ${error.message ?? "error"}`,
          });
        } else if ((data as any)?.success === false) {
          updateRow(p.id, {
            status: "error",
            provider: (data as any).provider ?? provider,
            error: (data as any).error ?? "Error desconocido",
          });
        } else {
          const d = data as any;
          const before = {
            title: d.before?.title_length ?? 0,
            desc: d.before?.description_length ?? 0,
          };
          const after = {
            title: d.after?.title_length ?? before.title,
            desc: d.after?.description_length ?? before.desc,
          };
          updateRow(p.id, {
            status: "ok",
            provider: d.provider,
            score: d.score,
            completed: d.completed_fields,
            complete: !!d.complete,
            warnings: Array.isArray(d.warnings) ? d.warnings : [],
            before,
            after,
          });
        }
      } catch (e: any) {
        updateRow(p.id, { status: "error", error: e?.message ?? String(e) });
      }
      setDone(i + 1);
    }
    setRunning(false);
    toast.success("SEO masivo completado");
    onDone();
  };

  const run = () => runWith({});
  const fixTo100 = () => runWith({ fix_to_100: true, protect_main: !improveMain });


  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> SEO Inteligente Masivo — {effectiveTargets.length} de {products.length} producto(s)
          </DialogTitle>
          <DialogDescription>
            Completa o corrige campos SEO con IA. Por defecto NO modifica el nombre principal del producto
            ni las descripciones visibles — solo metadata SEO.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Proveedor IA</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as any)} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI / ChatGPT</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="lovable">Lovable AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nivel</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as any)} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="equilibrado">Equilibrado</SelectItem>
                <SelectItem value="avanzado">Avanzado SEO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sobrescribir</Label>
            <label className="flex items-center gap-2 rounded-md border p-2 text-xs">
              <Checkbox
                checked={overwrite}
                onCheckedChange={(v) => setOverwrite(!!v)}
                disabled={running}
              />
              <span>{overwrite ? "Sobrescribir todo" : "Solo completar vacíos"}</span>
            </label>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40">
            <Checkbox
              checked={fixOutOfRange}
              onCheckedChange={(v) => setFixOutOfRange(!!v)}
              disabled={running}
            />
            <span>Corregir campos SEO fuera del rango ideal (título corto, meta corta, etc.)</span>
          </label>
          <label className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-amber-500/10 border-amber-500/40">
            <Checkbox
              checked={improveMain}
              onCheckedChange={(v) => setImproveMain(!!v)}
              disabled={running}
            />
            <span>
              <span className="font-medium">Avanzado:</span> mejorar también título y descripciones visibles del producto
            </span>
          </label>
        </div>

        <label className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40">
          <Checkbox
            checked={skipComplete}
            onCheckedChange={(v) => setSkipComplete(!!v)}
            disabled={running}
          />
          <span>
            Saltar productos con SEO completo
            {completeCount > 0 && (
              <span className="text-xs text-muted-foreground"> · {completeCount} se omitirán</span>
            )}
          </span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {FIELD_OPTIONS.map((o) => (
            <label
              key={o.key}
              className={`flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40 ${
                o.mainCopy && !improveMain ? "opacity-50" : ""
              }`}
            >
              <Checkbox
                checked={fields[o.key] && (!o.mainCopy || improveMain)}
                onCheckedChange={(v) => setFields((prev) => ({ ...prev, [o.key]: !!v }))}
                disabled={running || (o.mainCopy && !improveMain)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>

        <div className="rounded-md bg-muted/40 border border-border p-2 text-xs text-muted-foreground">
          El SEO masivo optimiza campos SEO. No modifica el título ni la descripción principal del producto,
          salvo que actives la opción avanzada.
        </div>

        {(running || done > 0) && (
          <div className="space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{done} / {total} procesados</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-md border max-h-80 overflow-y-auto text-sm">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Proveedor</th>
                  <th className="p-2">Antes → Después</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        {r.status === "running" && <Loader2 size={12} className="animate-spin shrink-0" />}
                        {r.status === "ok" && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                        {r.status === "error" && <AlertTriangle size={12} className="text-destructive shrink-0" />}
                        <span className="truncate">{r.name}</span>
                      </div>
                    </td>
                    <td className="p-2">{r.provider ?? "—"}</td>
                    <td className="p-2 text-[11px] leading-tight">
                      {r.before && r.after ? (
                        <>
                          <div>Tít: {r.before.title}→{r.after.title}</div>
                          <div>Meta: {r.before.desc}→{r.after.desc}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="p-2">{typeof r.score === "number" ? `${r.score}/100` : "—"}</td>
                    <td className="p-2">
                      {r.status === "ok" ? (
                        <div className="space-y-0.5">
                          <div>{r.complete ? "SEO completo" : `${r.completed ?? 0} campos`}</div>
                          {r.warnings && r.warnings.length > 0 && (
                            <div className="text-amber-600 text-[10px]">{r.warnings.join(" · ")}</div>
                          )}
                        </div>
                      ) : r.status === "error" ? (
                        <span className="text-destructive break-words">{r.error}</span>
                      ) : r.status === "running" ? "Procesando…" : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            {done > 0 && !running ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            variant="secondary"
            onClick={fixTo100}
            disabled={running || effectiveTargets.length === 0}
            title="Reescribe solo los campos SEO mal optimizados (no toca nombre, descripción principal, precio, stock ni imagen)"
          >
            {running ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Procesando…</> : <>Corregir SEO para 100/100</>}
          </Button>
          <Button onClick={run} disabled={running || effectiveTargets.length === 0}>
            {running ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Procesando…</> : <>Generar SEO con IA</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
