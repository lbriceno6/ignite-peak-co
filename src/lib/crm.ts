// CRM helpers — estado del cliente, plantillas y WhatsApp.

export type CrmEstado =
  | "pendiente_pago"
  | "pendiente_envio"
  | "carrito_abandonado"
  | "vip"
  | "recurrente"
  | "activo"
  | "inactivo"
  | "nuevo";

export const ESTADO_LABEL: Record<CrmEstado, string> = {
  pendiente_pago: "Pendiente de pago",
  pendiente_envio: "Pendiente de envío",
  carrito_abandonado: "Carrito abandonado",
  vip: "VIP",
  recurrente: "Recurrente",
  activo: "Activo",
  inactivo: "Inactivo",
  nuevo: "Nuevo",
};

export const ESTADO_BADGE: Record<CrmEstado, string> = {
  pendiente_pago: "bg-amber-100 text-amber-900 border-amber-300",
  pendiente_envio: "bg-blue-100 text-blue-900 border-blue-300",
  carrito_abandonado: "bg-orange-100 text-orange-900 border-orange-300",
  vip: "bg-purple-100 text-purple-900 border-purple-300",
  recurrente: "bg-emerald-100 text-emerald-900 border-emerald-300",
  activo: "bg-green-100 text-green-900 border-green-300",
  inactivo: "bg-zinc-200 text-zinc-700 border-zinc-300",
  nuevo: "bg-sky-100 text-sky-900 border-sky-300",
};

export const INTEREST_LABEL: Record<string, string> = {
  proteinas: "Proteínas",
  colageno: "Colágeno",
  energia: "Energía",
  digestion: "Digestión",
  diabeticos: "Diabéticos",
  articulaciones: "Articulaciones",
  bajar_peso: "Bajar de peso",
  masa_muscular: "Masa muscular",
  antioxidantes: "Antioxidantes",
  salud_general: "Salud general",
};

export const CART_STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  recuperado: "Recuperado",
  perdido: "Perdido",
};

export const CART_STATUS_BADGE: Record<string, string> = {
  nuevo: "bg-sky-100 text-sky-900 border-sky-300",
  contactado: "bg-amber-100 text-amber-900 border-amber-300",
  recuperado: "bg-emerald-100 text-emerald-900 border-emerald-300",
  perdido: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

/** Rellena variables tipo {{nombre}} en una plantilla. */
export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Construye un link wa.me normalizando el teléfono (Perú por defecto). */
export function waLink(phone: string | null | undefined, message: string) {
  const digits = (phone || "").replace(/\D+/g, "");
  if (!digits) return null;
  const withCountry = digits.length === 9 ? `51${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/** Cliente Supabase tipado como any para tablas/vistas crm_* aún no presentes en types.ts. */
export function crmTable<T = any>(supabase: any, name: string) {
  return supabase.from(name) as any;
}
