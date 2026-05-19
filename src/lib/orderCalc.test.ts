import { describe, it, expect } from "vitest";
import {
  computeOrderTotals,
  computeResellerDiscount,
  computeShipping,
  computeStoreCreditApplied,
} from "./orderCalc";

const SHIPPING = { freeThreshold: 50, baseCost: 4.9 };

describe("computeShipping", () => {
  it("is 0 when cart is empty", () => {
    expect(computeShipping(0, SHIPPING)).toBe(0);
  });
  it("charges baseCost below threshold", () => {
    expect(computeShipping(20, SHIPPING)).toBe(4.9);
  });
  it("is free strictly above threshold", () => {
    expect(computeShipping(60, SHIPPING)).toBe(0);
  });
  it("still charges exactly at the threshold", () => {
    expect(computeShipping(50, SHIPPING)).toBe(4.9);
  });
});

describe("computeResellerDiscount", () => {
  it("returns 0 without a percent", () => {
    expect(computeResellerDiscount(100, null)).toBe(0);
    expect(computeResellerDiscount(100, 0)).toBe(0);
  });
  it("rounds to two decimals", () => {
    expect(computeResellerDiscount(33.33, 10)).toBe(3.33);
  });
  it("returns 0 for an empty cart", () => {
    expect(computeResellerDiscount(0, 10)).toBe(0);
  });
});

describe("computeStoreCreditApplied", () => {
  it("does nothing when toggle off", () => {
    expect(computeStoreCreditApplied(100, 40, false)).toBe(0);
  });
  it("caps to payable when credit exceeds total", () => {
    expect(computeStoreCreditApplied(100, 40, true)).toBe(40);
  });
  it("caps to balance when payable exceeds credit", () => {
    expect(computeStoreCreditApplied(15, 40, true)).toBe(15);
  });
  it("handles null/negative balance", () => {
    expect(computeStoreCreditApplied(null, 40, true)).toBe(0);
    expect(computeStoreCreditApplied(-10, 40, true)).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  it("empty cart → all zeros, no shipping", () => {
    const t = computeOrderTotals({ rawSubtotal: 0, ...SHIPPING, useCredit: true, balanceCredit: 999 });
    expect(t).toEqual({ rawSubtotal: 0, discount: 0, subtotal: 0, shipping: 0, creditApplied: 0, total: 0 });
  });

  it("free shipping combined with reseller discount", () => {
    const t = computeOrderTotals({ rawSubtotal: 80, ...SHIPPING, discountPercent: 10 });
    expect(t.discount).toBe(8);
    expect(t.shipping).toBe(0); // free shipping evaluated on rawSubtotal
    expect(t.total).toBe(72);
  });

  it("credit larger than total never drives total negative", () => {
    const t = computeOrderTotals({
      rawSubtotal: 20,
      ...SHIPPING,
      balanceCredit: 500,
      useCredit: true,
    });
    // subtotal 20 + shipping 4.9 = 24.9, credit caps there
    expect(t.creditApplied).toBe(24.9);
    expect(t.total).toBe(0);
  });

  it("partial credit reduces total by exact balance", () => {
    const t = computeOrderTotals({
      rawSubtotal: 30,
      ...SHIPPING,
      balanceCredit: 10,
      useCredit: true,
    });
    expect(t.creditApplied).toBe(10);
    expect(t.total).toBe(30 + 4.9 - 10);
  });

  it("discount + credit + free shipping stack correctly", () => {
    const t = computeOrderTotals({
      rawSubtotal: 100,
      ...SHIPPING,
      discountPercent: 15,
      balanceCredit: 20,
      useCredit: true,
    });
    expect(t.discount).toBe(15);
    expect(t.shipping).toBe(0);
    expect(t.subtotal).toBe(85);
    expect(t.creditApplied).toBe(20);
    expect(t.total).toBe(65);
  });
});
