import { Check, MapPin, Truck, Package, AlertTriangle, Clock } from "lucide-react";
import type { OrderShipment } from "@/hooks/useOrderShipment";
import {
  PROGRESS_STEPS,
  SHIPMENT_BADGE_CLASS,
  SHIPMENT_LABEL,
  progressIndex,
  type ShipmentStatus,
} from "@/lib/shalomStatus";
import { cn } from "@/lib/utils";

type Props = { shipment: OrderShipment | null; carrierName?: string };

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

export const ShipmentTracking = ({ shipment, carrierName = "Shalom" }: Props) => {
  if (!shipment || shipment.status_internal === "sin_tracking") {
    return (
      <div className="rounded-lg border border-border p-5">
        <h3 className="font-display uppercase mb-2">Seguimiento de envío</h3>
        <p className="text-sm text-muted-foreground">
          Aún no se ha registrado un envío para este pedido. Cuando lo despachemos verás aquí el avance en tiempo real.
        </p>
      </div>
    );
  }

  const status = shipment.status_internal as ShipmentStatus;
  const isDemora = status === "demora";
  const stepIdx = progressIndex(status);
  const history = Array.isArray(shipment.history_json) ? shipment.history_json : [];

  return (
    <section className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <header className={cn("px-5 py-4 border-b border-border", isDemora && "bg-destructive/5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Estado del envío</p>
            <h3 className={cn("font-display text-2xl mt-1", isDemora && "text-destructive")}>
              {SHIPMENT_LABEL[status]}
            </h3>
          </div>
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", SHIPMENT_BADGE_CLASS[status])}>
            {isDemora ? <AlertTriangle size={14} /> : <Truck size={14} />}
            {carrierName}
          </div>
        </div>
        {shipment.tracking_number && (
          <p className="mt-2 text-sm text-muted-foreground">
            N° de tracking: <span className="font-mono text-foreground">{shipment.tracking_number}</span>
            {shipment.tracking_code && <> · Código: <span className="font-mono text-foreground">{shipment.tracking_code}</span></>}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
          <Clock size={12} /> Última actualización: {formatDate(shipment.last_checked_at ?? shipment.updated_at)}
        </p>
      </header>

      {/* Progress line */}
      <div className="px-5 py-6">
        <ol className="grid grid-cols-4 gap-2">
          {PROGRESS_STEPS.map((step, i) => {
            const active = i <= stepIdx;
            const current = i === stepIdx && !isDemora;
            return (
              <li key={step.key} className="flex flex-col items-center text-center">
                <div className={cn(
                  "h-9 w-9 rounded-full border-2 grid place-items-center transition",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
                  current && "ring-4 ring-primary/20",
                  isDemora && i === 1 && "border-destructive bg-destructive text-destructive-foreground",
                )}>
                  {i === 3 && active ? <Check size={16} /> : i === 0 ? <Package size={14} /> : i === 1 ? <Truck size={14} /> : <MapPin size={14} />}
                </div>
                <span className={cn("mt-2 text-xs", active ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {step.label}
                </span>
                {i < PROGRESS_STEPS.length - 1 && (
                  <div className={cn("hidden", )} />
                )}
              </li>
            );
          })}
        </ol>
        {/* Connector bar */}
        <div className="relative -mt-[42px] mx-12 h-[2px] bg-border -z-0">
          <div
            className={cn("h-full transition-all", isDemora ? "bg-destructive" : "bg-primary")}
            style={{ width: `${Math.max(0, Math.min(3, stepIdx)) / 3 * 100}%` }}
          />
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid sm:grid-cols-2 gap-4 px-5 pb-5 text-sm">
        <Field label="Origen" value={shipment.origin_name} />
        <Field label="Destino" value={shipment.destination_name} />
        <Field label="Fecha de registro" value={formatDate(shipment.registered_at)} />
        <Field label="Fecha estimada / entrega" value={formatDate(shipment.delivered_at ?? shipment.estimated_delivery_at)} />
        <Field label="Transportista" value={carrierName} />
        {shipment.ose_id && <Field label="OSE ID" value={shipment.ose_id} mono />}
      </div>

      {/* History */}
      <div className="border-t border-border px-5 py-4">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Historial de movimientos</h4>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {shipment.last_event_title ?? "Aún no hay movimientos registrados."}
          </p>
        ) : (
          <ol className="space-y-3">
            {history.map((ev, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{ev.title || ev.description || "Movimiento"}</p>
                  {ev.description && ev.title && (
                    <p className="text-xs text-muted-foreground">{ev.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[ev.date, ev.time, ev.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn("mt-0.5", mono && "font-mono text-xs")}>{value || "—"}</p>
  </div>
);
