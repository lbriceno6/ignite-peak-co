// Revisión editorial humana: estado, revisor, notas internas y visibilidad pública.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck } from "lucide-react";

export const EDITORIAL_STATUSES = [
  { value: "unreviewed", label: "Sin revisar" },
  { value: "in_review", label: "En revisión" },
  { value: "reviewed", label: "Revisado por humano" },
  { value: "approved", label: "Aprobado para publicar" },
];

export const editorialLabel = (v?: string | null) =>
  EDITORIAL_STATUSES.find((s) => s.value === (v ?? "unreviewed"))?.label ?? "Sin revisar";

export const editorialVariant = (v?: string | null): "default" | "secondary" | "outline" =>
  v === "approved" ? "default" : v === "reviewed" ? "secondary" : "outline";

type Props = { row: any; onChange: (patch: Record<string, any>) => void };

export default function LandingEditorialReviewCard({ row, onChange }: Props) {
  const markReviewed = () =>
    onChange({
      editorial_status: "reviewed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: row?.reviewed_by || "Equipo Nutribatidos",
    });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><UserCheck size={16} className="text-primary" /> Revisión editorial</CardTitle>
          <CardDescription>El contenido generado con IA debe revisarse antes de publicar.</CardDescription>
        </div>
        <Badge variant={editorialVariant(row?.editorial_status)}>{editorialLabel(row?.editorial_status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Estado editorial</Label>
            <Select value={row?.editorial_status ?? "unreviewed"} onValueChange={(v) => onChange({ editorial_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDITORIAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Revisado por</Label>
            <Input
              value={row?.reviewed_by ?? ""}
              placeholder="Nombre del revisor"
              onChange={(e) => onChange({ reviewed_by: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas internas</Label>
          <Textarea
            rows={3}
            value={row?.review_notes ?? ""}
            placeholder="Qué falta comprobar, fuentes, cambios pendientes…"
            onChange={(e) => onChange({ review_notes: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Estas notas nunca se muestran en la web.</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Mostrar “Revisado por” en la landing</p>
            <p className="text-xs text-muted-foreground">
              {row?.reviewed_at ? `Última revisión: ${new Date(row.reviewed_at).toLocaleDateString("es-PE")}` : "Aún sin fecha de revisión"}
            </p>
          </div>
          <Switch checked={!!row?.show_review_info} onCheckedChange={(v) => onChange({ show_review_info: v })} />
        </div>

        <Button variant="outline" size="sm" onClick={markReviewed}>Marcar como revisado hoy</Button>
      </CardContent>
    </Card>
  );
}
