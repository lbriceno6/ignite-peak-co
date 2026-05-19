// Pure calculation helpers for cart/checkout totals.
// Kept framework-free so they're easy to unit-test.

export const computeShipping = (
  rawSubtotal: number,
  opts: { freeThreshold: number; baseCost: number },
): number => {
  if (rawSubtotal <= 0) return 0;
  return rawSubtotal > opts.freeThreshold ? 0 : opts.baseCost;
};

export const computeResellerDiscount = (
  rawSubtotal: number,
  discountPercent: number | null | undefined,
): number => {
  if (!discountPercent || rawSubtotal <= 0) return 0;
  return Math.round(rawSubtotal * discountPercent) / 100;
};

export const computeStoreCreditApplied = (
  balanceCredit: number | null | undefined,
  payableBeforeCredit: number,
  useCredit: boolean,
): number => {
  if (!useCredit) return 0;
  const balance = Math.max(0, balanceCredit ?? 0);
  if (balance <= 0 || payableBeforeCredit <= 0) return 0;
  return Math.min(balance, payableBeforeCredit);
};

export type OrderTotals = {
  rawSubtotal: number;
  discount: number;
  subtotal: number;
  shipping: number;
  creditApplied: number;
  total: number;
};

export const computeOrderTotals = (input: {
  rawSubtotal: number;
  freeThreshold: number;
  baseCost: number;
  discountPercent?: number | null;
  balanceCredit?: number | null;
  useCredit?: boolean;
}): OrderTotals => {
  const rawSubtotal = Math.max(0, input.rawSubtotal);
  const discount = computeResellerDiscount(rawSubtotal, input.discountPercent);
  const subtotal = Math.max(0, rawSubtotal - discount);
  const shipping = computeShipping(rawSubtotal, {
    freeThreshold: input.freeThreshold,
    baseCost: input.baseCost,
  });
  const payable = subtotal + shipping;
  const creditApplied = computeStoreCreditApplied(input.balanceCredit, payable, !!input.useCredit);
  const total = Math.max(0, payable - creditApplied);
  return { rawSubtotal, discount, subtotal, shipping, creditApplied, total };
};
