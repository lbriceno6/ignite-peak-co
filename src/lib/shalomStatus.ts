// Status mapping + labels for Shalom shipments.
// Used on both client and server (pure functions, no imports).

export type ShipmentStatus =
  | "sin_tracking"
  | "preparando"
  | "origen"
  | "transito"
  | "demora"
  | "destino"
  | "reparto"
  | "entregado"
  | "cancelado"
  | "devuelto";

export const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  sin_tracking: "Sin tracking",
  preparando: "Preparando envío",
  origen: "En origen",
  transito: "En tránsito",
  demora: "Demora de envío",
  destino: "En destino",
  reparto: "En reparto",
  entregado: "Entregado",
  cancelado: "Cancelado",
  devuelto: "Devuelto",
};

export const SHIPMENT_BADGE_CLASS: Record<ShipmentStatus, string> = {
  sin_tracking: "bg-muted text-muted-foreground",
  preparando: "bg-muted text-foreground",
  origen: "bg-blue-500/15 text-blue-600",
  transito: "bg-amber-500/15 text-amber-600",
  demora: "bg-destructive/15 text-destructive",
  destino: "bg-purple-500/15 text-purple-600",
  reparto: "bg-indigo-500/15 text-indigo-600",
  entregado: "bg-emerald-500/15 text-emerald-600",
  cancelado: "bg-destructive/15 text-destructive",
  devuelto: "bg-destructive/15 text-destructive",
};

// Linear visual progress used in the client detail page.
export const PROGRESS_STEPS: { key: ShipmentStatus; label: string }[] = [
  { key: "origen", label: "En origen" },
  { key: "transito", label: "En tránsito" },
  { key: "destino", label: "En destino" },
  { key: "entregado", label: "Entregado" },
];

export const progressIndex = (status: ShipmentStatus): number => {
  switch (status) {
    case "preparando":
    case "sin_tracking":
      return -1;
    case "origen":
      return 0;
    case "transito":
    case "demora":
      return 1;
    case "destino":
    case "reparto":
      return 2;
    case "entregado":
      return 3;
    default:
      return -1;
  }
};

export const isTerminal = (s: ShipmentStatus) =>
  s === "entregado" || s === "cancelado" || s === "devuelto";

export type ShalomEvent = {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  [k: string]: unknown;
};

// Heuristic mapping from raw Shalom events to internal status.
// Priority: entregado > reparto > destino > demora > transito > origen > preparando
export const mapShalomStatus = (
  events: ShalomEvent[] | undefined | null,
  deliveredFlag?: boolean,
): ShipmentStatus => {
  if (deliveredFlag) return "entregado";
  if (!events || events.length === 0) return "preparando";

  const text = events
    .map((e) => `${e.title ?? ""} ${e.description ?? ""}`.toLowerCase())
    .join(" || ");

  const has = (...needles: string[]) => needles.some((n) => text.includes(n));

  if (has("entregado", "delivered")) return "entregado";
  if (has("reparto", "para entrega", "out for delivery")) return "reparto";
  if (has("en destino", "agencia destino", "arribó", "arribo a destino")) return "destino";
  if (has("demora", "retraso", "rezagado")) return "demora";
  if (has("tránsito", "transito", "in transit", "en ruta")) return "transito";
  if (has("origen", "recepcionado", "recibido en agencia", "en origen")) return "origen";
  return "preparando";
};
