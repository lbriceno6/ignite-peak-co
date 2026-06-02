// Fase 14 — Email transaccional IA: panel admin para auditar últimos envíos
// post-compra (confirmación con recomendaciones IA).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, Sparkles, AlertCircle } from "lucide-react";

type Row = {
  id: string;
  order_code: string | null;
  recipient_email: string;
  email_type: string;
  ai_picks: any[] | null;
  ai_thank_you: string | null;
  ai_variant: string | null;
  source: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

export function AiEmailLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, withAi: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("ai_email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const list = (data ?? []) as Row[];
      setRows(list);
      setStats({
        total: list.length,
        sent: list.filter((r) => r.status === "sent").length,
        failed: list.filter((r) => r.status === "failed").length,
        withAi: list.filter((r) => r.source === "ai").length,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail size={18} /> Emails post-compra con IA
        </CardTitle>
        <CardDescription>
          Últimos 50 envíos de confirmación con recomendaciones generadas por IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Enviados" value={stats.sent} />
          <Stat label="Fallidos" value={stats.failed} />
          <Stat label="Con IA" value={stats.withAi} icon={<Sparkles size={14} />} />
          <Stat label="Total" value={stats.total} />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay envíos. Se generan automáticamente al confirmar un pedido.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Picks IA</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-PE", {
                        dateStyle: "short", timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.order_code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.recipient_email}</TableCell>
                    <TableCell>
                      <Badge variant={r.source === "ai" ? "default" : "secondary"}>
                        {r.source ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{(r.ai_picks ?? []).length}</TableCell>
                    <TableCell>
                      {r.status === "sent" ? (
                        <Badge variant="default">Enviado</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle size={12} />
                          {r.error?.slice(0, 40) ?? "fallo"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
