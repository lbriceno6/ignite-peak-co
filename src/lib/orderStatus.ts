// Unified order status labels + colors used in admin and client.

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

// Same palette used on both admin and client.
export const ORDER_STATUS_CLASS: Record<string, string> = {
  pending: "bg-muted text-foreground",
  confirmed: "bg-blue-500/15 text-blue-600",
  preparing: "bg-amber-500/15 text-amber-600",
  shipped: "bg-purple-500/15 text-purple-600",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  delivered: 4,
};

// Map a shipment internal status to the minimum corresponding order status.
export const shipmentToOrderStatus = (s?: string | null): OrderStatus | null => {
  switch (s) {
    case "preparando":
      return "preparing";
    case "origen":
    case "transito":
    case "demora":
    case "destino":
    case "reparto":
      return "shipped";
    case "entregado":
      return "delivered";
    default:
      return null;
  }
};

// Returns target if it is "ahead" of current (never downgrades, never overrides cancelled).
export const nextOrderStatus = (current: string, target: OrderStatus | null): OrderStatus | null => {
  if (!target) return null;
  if (current === "cancelled") return null;
  const cr = RANK[current] ?? -1;
  const tr = RANK[target] ?? -1;
  return tr > cr ? target : null;
};
