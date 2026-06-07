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
  const [fields, setFields] = useState<Record<FieldKey, boolean>>(() =>
    Object.fromEntries(FIELD_OPTIONS.map((o) => [o.key, !o.mainCopy])) as any,
  );
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!open) return;
    setRows(products.map((p) => ({ id: p.id, name: p.name, status: "pending" })));
    setDone(0);
  }, [open, products]);

  const total = products.length;
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
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const before = {
        title: String((p as any).seo_title ?? "").length,
        desc: String((p as any).seo_description ?? "").length,
      };
      updateRow(p.id, { status: "running", before });
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
          const patch = d.seo_patch ?? {};
          const afterTitle = patch.seo_title ? String(patch.seo_title).length : before.title;
          const afterDesc = patch.seo_description ? String(patch.seo_description).length : before.desc;
          updateRow(p.id, {
            status: "ok",
            provider: d.provider,
            score: d.score,
            completed: d.completed_fields,
            complete: !!d.complete,
            warnings: Array.isArray(d.warnings) ? d.warnings : [],
            after: { title: afterTitle, desc: afterDesc },
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
            <Sparkles size={18} className="text-primary" /> SEO Inteligente Masivo — {products.length} producto(s)
          </DialogTitle>
          <DialogDescription>
            Genera meta title, descripción, slug, canonical, OG, keywords, tags, Shopping y alt text con IA.
            Por defecto solo completa campos vacíos.
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
            <Label className="text-xs">Modo</Label>
            <label className="flex items-center gap-2 rounded-md border p-2 text-xs">
              <Checkbox
                checked={overwrite}
                onCheckedChange={(v) => setOverwrite(!!v)}
                disabled={running}
              />
              <span>{overwrite ? "Sobrescribir existentes" : "Solo completar vacíos"}</span>
            </label>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {FIELD_OPTIONS.map((o) => (
            <label key={o.key} className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={fields[o.key]}
                onCheckedChange={(v) => setFields((prev) => ({ ...prev, [o.key]: !!v }))}
                disabled={running}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>

        {(running || done > 0) && (
          <div className="space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{done} / {total} procesados</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-md border max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Proveedor</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Campos</th>
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
                    <td className="p-2">{typeof r.score === "number" ? `${r.score}/100` : "—"}</td>
                    <td className="p-2">{r.completed ?? "—"}</td>
                    <td className="p-2">
                      {r.status === "ok" ? (r.complete ? "SEO completo" : "Faltan datos") :
                       r.status === "error" ? <span className="text-destructive break-words">{r.error}</span> :
                       r.status === "running" ? "Procesando…" : "Pendiente"}
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
            disabled={running || products.length === 0}
            title="Reescribe solo los campos SEO mal optimizados (no toca nombre, descripción principal, precio, stock ni imagen)"
          >
            {running ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Procesando…</> : <>Corregir SEO para 100/100</>}
          </Button>
          <Button onClick={run} disabled={running || products.length === 0}>
            {running ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Procesando…</> : <>Generar SEO con IA</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
