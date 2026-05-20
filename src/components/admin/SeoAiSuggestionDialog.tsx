import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import type { SeoEntityType } from "@/hooks/useSeoMeta";

export type AiSuggestion = {
  id: string;
  seo_title: string | null;
  seo_description: string | null;
  slug: string | null;
  keywords: string[];
  tags: string[];
  short_description: string | null;
  long_description: string | null;
  shopping_title: string | null;
  shopping_description: string | null;
  faqs: { question: string; answer: string }[];
  image_alts: { image_url: string; alt_text: string }[];
};

type Field = keyof Omit<AiSuggestion, "id" | "faqs" | "image_alts">;

const FIELD_LABELS: Record<string, string> = {
  seo_title: "Título SEO",
  seo_description: "Meta descripción",
  slug: "Slug",
  keywords: "Palabras clave",
  tags: "Tags",
  short_description: "Descripción corta",
  long_description: "Descripción larga",
  shopping_title: "Título Google Shopping",
  shopping_description: "Descripción Google Shopping",
};

type Props = {
  open: boolean;
  onClose: () => void;
  entityType: SeoEntityType;
  entityId: string;
  current: Record<string, any>;
  /** Called with the partial of accepted fields (form state) and the alts map */
  onApply: (patch: Record<string, any>, alts: Record<string, string>, faqs: { question: string; answer: string }[]) => void;
};

const renderValue = (v: any) => {
  if (v == null || v === "") return <span className="text-muted-foreground italic">— vacío —</span>;
  if (Array.isArray(v)) return <span>{v.join(", ") || <span className="text-muted-foreground italic">— vacío —</span>}</span>;
  return <span className="whitespace-pre-wrap break-words">{String(v)}</span>;
};

export const SeoAiSuggestionDialog = ({ open, onClose, entityType, entityId, current, onApply }: Props) => {
  const [loading, setLoading] = useState(false);
  const [sug, setSug] = useState<AiSuggestion | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [acceptFaqs, setAcceptFaqs] = useState(true);
  const [altAccepted, setAltAccepted] = useState<Record<string, boolean>>({});

  const generate = async () => {
    setLoading(true);
    setSug(null);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generate", {
        body: { entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s = (data as any).suggestion as AiSuggestion;
      setSug(s);
      // Default: accept all non-empty fields
      const acc: Record<string, boolean> = {};
      (Object.keys(FIELD_LABELS) as Field[]).forEach((f) => {
        const v = (s as any)[f];
        if (Array.isArray(v) ? v.length : v) acc[f] = true;
      });
      setAccepted(acc);
      const aa: Record<string, boolean> = {};
      (s.image_alts ?? []).forEach((a) => { aa[a.image_url] = true; });
      setAltAccepted(aa);
      setAcceptFaqs((s.faqs ?? []).length > 0);
    } catch (e: any) {
      toast.error(e.message || "Error al generar SEO");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!sug) return;
    const patch: Record<string, any> = {};
    (Object.keys(FIELD_LABELS) as Field[]).forEach((f) => {
      if (accepted[f]) patch[f] = (sug as any)[f];
    });
    const alts: Record<string, string> = {};
    (sug.image_alts ?? []).forEach((a) => { if (altAccepted[a.image_url]) alts[a.image_url] = a.alt_text; });
    const faqs = acceptFaqs ? (sug.faqs ?? []) : [];
    onApply(patch, alts, faqs);
    toast.success("Sugerencias aplicadas. No olvides Guardar SEO.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles size={18} /> Generar SEO con IA</DialogTitle>
          <DialogDescription>Revisa cada campo y acepta solo los que quieras aplicar.</DialogDescription>
        </DialogHeader>

        {!sug && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Button variant="dark" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analizando con IA..." : "Generar sugerencias"}
            </Button>
            <p className="text-xs text-muted-foreground">Usa Lovable AI · Gemini 3 Flash</p>
          </div>
        )}

        {sug && (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-3">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => {
                const newVal = (sug as any)[f];
                const curVal = current[f];
                const hasNew = Array.isArray(newVal) ? newVal.length > 0 : !!newVal;
                return (
                  <div key={f} className={`rounded-md border p-3 ${accepted[f] ? "border-primary/50 bg-primary/5" : ""}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={!!accepted[f]}
                        disabled={!hasNew}
                        onCheckedChange={(v) => setAccepted((p) => ({ ...p, [f]: !!v }))}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-semibold">{FIELD_LABELS[f]}</div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="rounded bg-muted/40 p-2 text-xs">
                            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Actual</div>
                            {renderValue(curVal)}
                          </div>
                          <div className="rounded bg-emerald-50 p-2 text-xs dark:bg-emerald-950/30">
                            <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Sugerido</div>
                            {renderValue(newVal)}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}

              {(sug.faqs?.length ?? 0) > 0 && (
                <div className={`rounded-md border p-3 ${acceptFaqs ? "border-primary/50 bg-primary/5" : ""}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={acceptFaqs} onCheckedChange={(v) => setAcceptFaqs(!!v)} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-2">FAQs ({sug.faqs.length})</div>
                      <ul className="space-y-2 text-xs">
                        {sug.faqs.map((q, i) => (
                          <li key={i} className="rounded bg-muted/40 p-2">
                            <div className="font-medium">{q.question}</div>
                            <div className="text-muted-foreground">{q.answer}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                </div>
              )}

              {(sug.image_alts?.length ?? 0) > 0 && (
                <div className="rounded-md border p-3">
                  <div className="text-sm font-semibold mb-2">Alt text de imágenes</div>
                  <div className="space-y-2">
                    {sug.image_alts.map((a) => (
                      <label key={a.image_url} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={!!altAccepted[a.image_url]} onCheckedChange={(v) => setAltAccepted((p) => ({ ...p, [a.image_url]: !!v }))} />
                        <img src={a.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 text-xs">{a.alt_text}</div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {sug && <Button variant="outline" onClick={generate} disabled={loading}>Regenerar</Button>}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {sug && <Button variant="dark" onClick={apply}><Check size={16} /> Aplicar seleccionados</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
