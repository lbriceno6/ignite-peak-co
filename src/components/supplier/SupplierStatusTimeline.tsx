import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, XCircle, Ban, RefreshCw, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; from_status: string | null; to_status: string; reason: string | null; created_at: string };

const ICON: Record<string, any> = {
  pending: Clock, approved: CheckCircle2, rejected: XCircle, suspended: Ban,
};
const LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", suspended: "Suspendido",
};

export const SupplierStatusTimeline = ({ supplierId }: { supplierId: string }) => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!supplierId) return;
    supabase.from("supplier_status_history")
      .select("id,from_status,to_status,reason,created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [supplierId]);

  if (!rows) return null;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {rows.map((r, i) => {
        const Icon = ICON[r.to_status] ?? FileText;
        const isResubmit = r.from_status === "rejected" && r.to_status === "pending";
        const Bullet = isResubmit ? RefreshCw : Icon;
        return (
          <li key={r.id} className="relative">
            <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border bg-background">
              <Bullet size={12} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={i === 0 ? "default" : "secondary"}>
                {isResubmit ? "Reenvío" : LABEL[r.to_status] ?? r.to_status}
              </Badge>
              {r.from_status && (
                <span className="text-xs text-muted-foreground">
                  desde {LABEL[r.from_status] ?? r.from_status}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                · {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
};
