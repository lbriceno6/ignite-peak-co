// Lógica de promociones — soporta variantes BOGO, 2x1, %off, fijo, por cantidad y custom.
import type { CartItem } from "@/store/cart";
import { lineUnitPrice } from "@/store/cart";

export type PromotionBenefitType = "second_discount" | "second_free";

/** Variante extendida (texto en BD para no migrar el enum). */
export type PromotionVariant =
  | "second_discount"
  | "second_free"
  | "two_for_one"
  | "percent_off"
  | "fixed_off"
  | "quantity_discount"
  | "custom";

export const VARIANT_LABELS: Record<PromotionVariant, string> = {
  second_discount: "Compra 1 y lleva el 2do con descuento",
  second_free: "Segundo producto gratis",
  two_for_one: "2x1",
  percent_off: "Descuento porcentual",
  fixed_off: "Descuento fijo",
  quantity_discount: "Descuento por cantidad",
  custom: "Promoción personalizada",
};

export type Promotion = {
  id: string;
  name: string;
  benefit_type: PromotionBenefitType;
  variant: PromotionVariant;
  discount_percent: number; // 0-100
  discount_amount: number;  // monto fijo (fixed_off)
  min_quantity: number;     // cantidad mínima para activar
  priority: number;
  badge_label: string | null;
  benefit_message: string | null;
  cart_msg_applied: string | null;
  cart_msg_progress: string | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit_per_order: number;
  show_on_home: boolean;
  show_on_product: boolean;
  show_in_carousel: boolean;
  sort_order_home: number;
  is_active: boolean;
  product_ids: string[];
};

export type AppliedPromo = {
  promotionId: string;
  name: string;
  label: string;
  amount: number;
  message: string;
};

const variantOf = (p: PromoLike): PromotionVariant =>
  (p.variant as PromotionVariant) || (p.benefit_type as PromotionVariant) || "second_discount";

type PromoLike = {
  variant?: PromotionVariant | null;
  benefit_type?: PromotionBenefitType | string;
  discount_percent?: number;
  discount_amount?: number;
  badge_label?: string | null;
  benefit_message?: string | null;
  cart_msg_applied?: string | null;
  cart_msg_progress?: string | null;
  min_quantity?: number;
};

const variantOfLoose = (p: PromoLike): PromotionVariant =>
  (p.variant as PromotionVariant) || (p.benefit_type as PromotionVariant) || "second_discount";

/** Etiqueta corta para badges. Usa badge_label custom si existe, si no autogenera. */
export const promoLabel = (p: PromoLike): string => {
  if (p.badge_label && p.badge_label.trim()) return p.badge_label.trim().toUpperCase();
  const v = variantOfLoose(p);
  const pct = Math.round(p.discount_percent || 0);
  switch (v) {
    case "second_free":
    case "two_for_one":
      return "2x1";
    case "second_discount":
      return `2do con ${pct}%`;
    case "percent_off":
      return pct > 0 ? `-${pct}%` : "PROMO";
    case "fixed_off":
      return p.discount_amount > 0 ? `-S/ ${p.discount_amount}` : "PROMO";
    case "quantity_discount":
      return pct > 0 ? `${pct}% x cantidad` : "PROMO";
    default:
      return "PROMO";
  }
};

/** Título dinámico para banner y ficha. */
export const promoTitle = (p: PromoLike): string => {
  const v = variantOfLoose(p);
  return VARIANT_LABELS[v] ?? "Promoción";
};

/** Subtítulo / mensaje comercial. Usa benefit_message si está. */
export const promoSubtitle = (
  p: PromoLike,
): string => {
  if (p.benefit_message && p.benefit_message.trim()) return p.benefit_message.trim();
  const v = variantOfLoose(p);
  const pct = Math.round(p.discount_percent || 0);
  switch (v) {
    case "second_free":
    case "two_for_one":
      return "Agrega 2 productos participantes y paga solo el de mayor precio.";
    case "second_discount":
      return `Elige 2 productos participantes y recibe ${pct}% de descuento en el segundo.`;
    case "percent_off":
      return `${pct}% de descuento aplicado directamente al precio.`;
    case "fixed_off":
      return `S/ ${p.discount_amount} de descuento aplicado directamente.`;
    case "quantity_discount":
      return `Llévate ${p.min_quantity || 2} o más y obtén ${pct}% de descuento.`;
    default:
      return "Aprovecha esta promoción especial.";
  }
};

const fillProgress = (tpl: string, missing: number): string =>
  tpl.replace(/\{n\}/gi, String(missing)).replace(/\{faltan\}/gi, String(missing));

/** Mensaje en carrito cuando la promo está aplicada. */
export const promoCartMessage = (
  p: PromoLike,
): string => {
  if (p.cart_msg_applied && p.cart_msg_applied.trim()) return p.cart_msg_applied.trim();
  const v = variantOfLoose(p);
  const pct = Math.round(p.discount_percent || 0);
  switch (v) {
    case "second_free":
    case "two_for_one":
      return "Promoción 2x1 aplicada. El producto de menor precio queda gratis.";
    case "second_discount":
      return `Promoción aplicada: ${pct}% de descuento en el segundo producto.`;
    case "percent_off":
      return `Promoción aplicada: ${pct}% de descuento.`;
    case "fixed_off":
      return `Promoción aplicada: S/ ${p.discount_amount} de descuento.`;
    case "quantity_discount":
      return `Promoción por cantidad aplicada: ${pct}% de descuento.`;
    default:
      return "Promoción aplicada.";
  }
};

/** Mensaje en carrito cuando falta(n) unidad(es) para activar la promo. */
export const promoCartProgress = (
  p: PromoLike,
  missing: number,
): string => {
  if (p.cart_msg_progress && p.cart_msg_progress.trim()) return fillProgress(p.cart_msg_progress, missing);
  const v = variantOfLoose(p);
  if (v === "custom") return `Agrega ${missing} producto${missing > 1 ? "s" : ""} más para activar la promoción.`;
  return `Agrega ${missing} producto${missing > 1 ? "s" : ""} más para activar esta promoción.`;
};

/** ¿La promoción está vigente en este momento? */
export const isPromoActiveNow = (p: Promotion, now: Date = new Date()): boolean => {
  if (!p.is_active) return false;
  if (p.start_date && new Date(p.start_date) > now) return false;
  if (p.end_date && new Date(p.end_date) < now) return false;
  return true;
};

/** Expande los CartItems a unidades planas (una por cantidad), con su precio unitario. */
const expandUnits = (items: CartItem[]) => {
  const out: { productId: string; price: number }[] = [];
  for (const it of items) {
    const unit = lineUnitPrice(it);
    for (let i = 0; i < it.quantity; i++) {
      out.push({ productId: it.product.id, price: unit });
    }
  }
  return out;
};

/** Por producto: cuánto descuento total se le aplicó y a qué promo pertenece. */
export type PerProductPromo = {
  productId: string;
  promotionId: string;
  label: string;
  participating: boolean;
  discountAmount: number;
};

/**
 * Ordena por prioridad (desc) y aplica una sola promoción por producto
 * (la de mayor prioridad). Si dos tienen igual prioridad gana la más reciente
 * (orden de entrada).
 */
const sortByPriority = (promotions: Promotion[]) =>
  [...promotions].sort((a, b) => (b.priority || 0) - (a.priority || 0));

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Devuelve descuento aplicado a una serie de unidades según la variante. */
const computeForUnits = (
  p: Promotion,
  units: { productId: string; price: number }[],
): { totalDiscount: number; perUnit: number[] } => {
  const v = variantOfLoose(p);
  const pct = Math.max(0, Math.min(100, p.discount_percent || 0));
  const perUnit: number[] = new Array(units.length).fill(0);
  if (!units.length) return { totalDiscount: 0, perUnit };

  if (v === "second_free" || v === "two_for_one" || v === "second_discount") {
    if (units.length < 2) return { totalDiscount: 0, perUnit };
    const sorted = units
      .map((u, i) => ({ ...u, i }))
      .sort((a, b) => a.price - b.price);
    const pairs = Math.floor(sorted.length / 2);
    const maxPairs = p.usage_limit_per_order > 0 ? Math.min(pairs, p.usage_limit_per_order) : pairs;
    const usePct = (v === "second_free" || v === "two_for_one") ? 100 : pct;
    let total = 0;
    for (let i = 0; i < maxPairs; i++) {
      const u = sorted[i];
      const d = round2((u.price * usePct) / 100);
      perUnit[u.i] = d;
      total += d;
    }
    return { totalDiscount: round2(total), perUnit };
  }

  if (v === "percent_off") {
    let total = 0;
    units.forEach((u, i) => {
      const d = round2((u.price * pct) / 100);
      perUnit[i] = d;
      total += d;
    });
    return { totalDiscount: round2(total), perUnit };
  }

  if (v === "fixed_off") {
    const amt = Math.max(0, p.discount_amount || 0);
    let total = 0;
    units.forEach((u, i) => {
      const d = Math.min(amt, u.price);
      perUnit[i] = round2(d);
      total += d;
    });
    return { totalDiscount: round2(total), perUnit };
  }

  if (v === "quantity_discount") {
    const min = Math.max(1, p.min_quantity || 2);
    if (units.length < min) return { totalDiscount: 0, perUnit };
    let total = 0;
    units.forEach((u, i) => {
      const d = round2((u.price * pct) / 100);
      perUnit[i] = d;
      total += d;
    });
    return { totalDiscount: round2(total), perUnit };
  }

  // custom: no auto-calc
  return { totalDiscount: 0, perUnit };
};

/** Calcula los descuentos totales. Una promo gana por producto (mayor prioridad). */
export const computePromotions = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): { totalDiscount: number; applied: AppliedPromo[] } => {
  const applied: AppliedPromo[] = [];
  let totalDiscount = 0;
  const units = expandUnits(items);
  const claimed = new Set<number>(); // unit index already covered by a promo

  for (const p of sortByPriority(promotions)) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;

    const participatingIdx: number[] = [];
    units.forEach((u, i) => {
      if (claimed.has(i)) return;
      if (p.product_ids.includes(u.productId)) participatingIdx.push(i);
    });
    if (!participatingIdx.length) continue;
    const sub = participatingIdx.map((i) => units[i]);

    const { totalDiscount: d, perUnit } = computeForUnits(p, sub);
    if (d <= 0) continue;

    // claim only units that actually received discount > 0
    perUnit.forEach((amt, k) => {
      if (amt > 0) claimed.add(participatingIdx[k]);
    });

    totalDiscount += d;
    applied.push({
      promotionId: p.id,
      name: p.name,
      label: promoLabel(p),
      amount: d,
      message: promoCartMessage(p),
    });
  }

  return { totalDiscount: round2(totalDiscount), applied };
};

/** Detalle por producto del descuento recibido (para mostrar en línea). */
export const perProductPromoBreakdown = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): Record<string, PerProductPromo> => {
  const out: Record<string, PerProductPromo> = {};
  const units = expandUnits(items);
  const claimed = new Set<number>();

  for (const p of sortByPriority(promotions)) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;

    // mark participation for badges even if not yet active
    for (const pid of p.product_ids) {
      if (!items.some((i) => i.product.id === pid)) continue;
      if (!out[pid]) {
        out[pid] = {
          productId: pid,
          promotionId: p.id,
          label: promoLabel(p),
          participating: true,
          discountAmount: 0,
        };
      }
    }

    const participatingIdx: number[] = [];
    units.forEach((u, i) => {
      if (claimed.has(i)) return;
      if (p.product_ids.includes(u.productId)) participatingIdx.push(i);
    });
    if (!participatingIdx.length) continue;
    const sub = participatingIdx.map((i) => units[i]);
    const { perUnit } = computeForUnits(p, sub);

    perUnit.forEach((amt, k) => {
      if (amt <= 0) return;
      const idx = participatingIdx[k];
      const u = units[idx];
      claimed.add(idx);
      if (!out[u.productId]) {
        out[u.productId] = {
          productId: u.productId,
          promotionId: p.id,
          label: promoLabel(p),
          participating: true,
          discountAmount: 0,
        };
      }
      out[u.productId].discountAmount = round2(out[u.productId].discountAmount + amt);
    });
  }
  return out;
};

/** Devuelve las promociones activas aplicables a un producto. */
export const promosForProduct = (productId: string, promotions: Promotion[], now: Date = new Date()) =>
  sortByPriority(
    promotions.filter((p) => isPromoActiveNow(p, now) && p.product_ids.includes(productId)),
  );

/** Promos activas en las que falta al menos 1 unidad participante para activarse. */
export const pendingPromoNudges = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): { promotion: Promotion; participatingUnits: number; missing: number; label: string; title: string; message: string }[] => {
  const units = expandUnits(items);
  const out: { promotion: Promotion; participatingUnits: number; missing: number; label: string; title: string; message: string }[] = [];
  for (const p of promotions) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;
    const v = variantOfLoose(p);
    const count = units.filter((u) => p.product_ids.includes(u.productId)).length;
    if (count < 1) continue;

    let needed = 0;
    if (v === "second_discount" || v === "second_free" || v === "two_for_one") {
      needed = 2;
    } else if (v === "quantity_discount") {
      needed = Math.max(1, p.min_quantity || 2);
    } else {
      continue; // percent/fixed/custom don't need accumulation
    }
    if (count >= needed) continue;
    const missing = needed - count;
    out.push({
      promotion: p,
      participatingUnits: count,
      missing,
      label: promoLabel(p),
      title: promoTitle(p),
      message: promoCartProgress(p, missing),
    });
  }
  return out;
};
