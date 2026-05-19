import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (n: number) => void;
  pageSizeOptions?: number[];
};

export function PaginationBar({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = [20, 40, 60, 100],
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const pages: (number | "…")[] = [];
  const push = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  push(1);
  for (let i = current - 1; i <= current + 1; i++) if (i > 1 && i < totalPages) push(i);
  if (totalPages > 1) push(totalPages);
  const withEllipsis: (number | "…")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && typeof n === "number" && typeof pages[i - 1] === "number" && n - (pages[i - 1] as number) > 1) {
      withEllipsis.push("…");
    }
    withEllipsis.push(n);
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p className="text-xs text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Por página:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(current - 1)} disabled={current <= 1}>
          <ChevronLeft size={14} />
        </Button>
        {withEllipsis.map((n, i) => n === "…" ? (
          <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <Button
            key={n}
            variant={n === current ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(n)}
          >
            {n}
          </Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(current + 1)} disabled={current >= totalPages}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
