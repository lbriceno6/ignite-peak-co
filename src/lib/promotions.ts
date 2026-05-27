// Lógica pura de promociones BOGO (Buy One Get One)
import type { CartItem } from "@/store/cart";
import { lineUnitPrice } from "@/store/cart";

export type PromotionBenefitType = "second_discount" | "second_free";

export type Promotion = {
  id: string;
  name: string;
  benefit_type: PromotionBenefitType;
  discount_percent: number; // 0-100
  start_date: string | null;
  end_date: string | null;
  usage_limit_per_order: number;
  show_on_home: boolean;
  show_on_product: boolean;
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

/** Etiqueta corta para badges en producto / carrito. */
export const promoLabel = (p: Pick<Promotion, "benefit_type" | "discount_percent">): string => {
  if (p.benefit_type === "second_free") return "2x1";
  const pct = Math.round(p.discount_percent);
  return `2do con ${pct}% dscto`;
};

/** Título dinámico para banner y ficha. */
export const promoTitle = (p: Pick<Promotion, "benefit_type">): string =>
  p.benefit_type === "second_free"
    ? "Compra uno y lleva otro gratis"
    : "Compra uno y lleva otro";

/** Subtítulo dinámico. */
export const promoSubtitle = (p: Pick<Promotion, "benefit_type">): string =>
  p.benefit_type === "second_free"
    ? "Agrega 2 productos participantes y paga solo el de mayor precio."
    : "Elige 2 productos participantes y recibe descuento en el segundo.";

/** Mensaje en carrito. */
export const promoCartMessage = (p: Pick<Promotion, "benefit_type" | "discount_percent">): string =>
  p.benefit_type === "second_free"
    ? "Promoción aplicada: segundo producto gratis. El descuento se aplicó al producto de menor precio."
    : `Promoción aplicada: ${Math.round(p.discount_percent)}% de descuento en el producto de menor precio.`;

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

/** Por producto: cuánto descuento total se le aplicó y a qué promo pertenece (la primera que lo cubre). */
export type PerProductPromo = {
  productId: string;
  promotionId: string;
  label: string;
  participating: boolean;
  discountAmount: number; // descuento que recibió ESTE producto
};

/**
 * Calcula los descuentos por promociones. Para cada promo activa, agrupa las
 * unidades participantes de menor a mayor precio y emparejadas; al elemento
 * de menor precio de cada par se le aplica el descuento.
 */
export const computePromotions = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): { totalDiscount: number; applied: AppliedPromo[] } => {
  const applied: AppliedPromo[] = [];
  let totalDiscount = 0;
  const units = expandUnits(items);

  for (const p of promotions) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;
    const participating = units
      .filter((u) => p.product_ids.includes(u.productId))
      .sort((a, b) => a.price - b.price); // menor a mayor
    if (participating.length < 2) continue;

    const pairs = Math.floor(participating.length / 2);
    const maxPairs = p.usage_limit_per_order > 0 ? Math.min(pairs, p.usage_limit_per_order) : pairs;
    if (maxPairs <= 0) continue;

    const pct = p.benefit_type === "second_free" ? 100 : Math.max(0, Math.min(100, p.discount_percent));
    let amount = 0;
    // Tomamos los `maxPairs` precios MÁS BAJOS — son los que reciben el descuento.
    for (let i = 0; i < maxPairs; i++) {
      amount += (participating[i].price * pct) / 100;
    }
    amount = Math.round(amount * 100) / 100;
    if (amount <= 0) continue;

    totalDiscount += amount;
    applied.push({
      promotionId: p.id,
      name: p.name,
      label: promoLabel(p),
      amount,
      message: promoCartMessage(p),
    });
  }

  return { totalDiscount: Math.round(totalDiscount * 100) / 100, applied };
};

/**
 * Devuelve, por productId, si participa en alguna promo activa y cuánto
 * descuento total recibió ESE producto en el cálculo BOGO actual.
 */
export const perProductPromoBreakdown = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): Record<string, PerProductPromo> => {
  const out: Record<string, PerProductPromo> = {};
  const units = expandUnits(items);

  for (const p of promotions) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;

    // Marca participación (aunque aún no alcance el mínimo de 2 unidades).
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

    const participating = units
      .map((u, idx) => ({ ...u, idx }))
      .filter((u) => p.product_ids.includes(u.productId))
      .sort((a, b) => a.price - b.price);
    if (participating.length < 2) continue;

    const pairs = Math.floor(participating.length / 2);
    const maxPairs = p.usage_limit_per_order > 0 ? Math.min(pairs, p.usage_limit_per_order) : pairs;
    if (maxPairs <= 0) continue;

    const pct = p.benefit_type === "second_free" ? 100 : Math.max(0, Math.min(100, p.discount_percent));
    for (let i = 0; i < maxPairs; i++) {
      const u = participating[i];
      const disc = Math.round(((u.price * pct) / 100) * 100) / 100;
      if (!out[u.productId]) {
        out[u.productId] = {
          productId: u.productId,
          promotionId: p.id,
          label: promoLabel(p),
          participating: true,
          discountAmount: 0,
        };
      }
      out[u.productId].discountAmount = Math.round((out[u.productId].discountAmount + disc) * 100) / 100;
    }
  }
  return out;
};

/** Devuelve las promociones activas aplicables a un producto. */
export const promosForProduct = (productId: string, promotions: Promotion[], now: Date = new Date()) =>
  promotions.filter((p) => isPromoActiveNow(p, now) && p.product_ids.includes(productId));

/**
 * Devuelve promociones activas en las que el carrito tiene al menos 1 unidad
 * participante pero aún no llega al mínimo de 2 unidades para activar el beneficio.
 * Útil para sugerir al cliente que agregue otro producto participante.
 */
export const pendingPromoNudges = (
  items: CartItem[],
  promotions: Promotion[],
  now: Date = new Date(),
): { promotion: Promotion; participatingUnits: number; label: string; title: string }[] => {
  const units = expandUnits(items);
  const out: { promotion: Promotion; participatingUnits: number; label: string; title: string }[] = [];
  for (const p of promotions) {
    if (!isPromoActiveNow(p, now)) continue;
    if (!p.product_ids?.length) continue;
    const count = units.filter((u) => p.product_ids.includes(u.productId)).length;
    if (count >= 1 && count < 2) {
      out.push({ promotion: p, participatingUnits: count, label: promoLabel(p), title: promoTitle(p) });
    }
  }
  return out;
};
