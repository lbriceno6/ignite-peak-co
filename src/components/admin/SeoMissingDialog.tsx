import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { ProductSeoStatusInfo } from "@/lib/productSeoStatus";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName?: string;
  info: ProductSeoStatusInfo | null;
  onFix: () => void;
};

export function SeoMissingDialog({ open, onOpenChange, productName, info, onFix }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Faltantes SEO {productName ? `· ${productName}` : ""}</DialogTitle>
          <DialogDescription>
            Score actual: <strong>{info?.score ?? 0}/100</strong> ·{" "}
            {info?.missing.length ? `${info.missing.length} campo(s) por corregir` : "Todo en orden"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-md border divide-y text-sm">
          {info?.missing.length ? info.missing.map((m) => (
            <div key={m.field} className="p-2.5 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{m.label} <span className="text-xs text-muted-foreground">(-{m.weight - m.earned} pts)</span></div>
                <div className="text-xs text-muted-foreground">{m.message}</div>
                <div className="text-xs">{m.fix}</div>
              </div>
            </div>
          )) : (
            <div className="p-4 text-center text-emerald-700 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> SEO completo
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          {info?.missing.length ? (
            <Button onClick={() => { onFix(); onOpenChange(false); }}>
              <Sparkles size={14} className="mr-1" /> Corregir estos campos con IA
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
