import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/data/catalog";

export type CartItem = {
  product: Product;
  quantity: number;
  flavor?: string;
  size?: string;
  subscription?: { intervalDays: number; discountPercent: number };
  comboId?: string;
};

export type CartCombo = {
  id: string; // combo_id
  name: string;
  savings: number; // currency amount (positive)
};

type CartState = {
  items: CartItem[];
  combos: CartCombo[];
  isOpen: boolean;
  wishlist: string[];
  add: (
    product: Product,
    opts?: {
      flavor?: string;
      size?: string;
      quantity?: number;
      subscription?: { intervalDays: number; discountPercent: number };
      comboId?: string;
    },
  ) => void;
  addCombo: (combo: { id: string; name: string; savings: number }, products: Array<{ product: Product; quantity: number }>) => void;
  removeCombo: (comboId: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  toggleWish: (id: string) => void;
};


const sameLine = (a: CartItem, b: { product: Product; flavor?: string; size?: string; subscription?: CartItem["subscription"] }) =>
  a.product.id === b.product.id &&
  a.flavor === b.flavor &&
  a.size === b.size &&
  (a.subscription?.intervalDays ?? null) === (b.subscription?.intervalDays ?? null);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      combos: [],
      isOpen: false,
      wishlist: [],
      add: (product, opts) =>
        set((s) => {
          const incoming = { product, flavor: opts?.flavor, size: opts?.size, subscription: opts?.subscription, comboId: opts?.comboId };
          const existing = s.items.find((i) => sameLine(i, incoming) && i.comboId === incoming.comboId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + (opts?.quantity ?? 1) } : i,
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...s.items,
              {
                product,
                quantity: opts?.quantity ?? 1,
                flavor: opts?.flavor,
                size: opts?.size,
                subscription: opts?.subscription,
                comboId: opts?.comboId,
              },
            ],
            isOpen: true,
          };
        }),
      addCombo: (combo, products) =>
        set((s) => {
          const alreadyHas = s.combos.some((c) => c.id === combo.id);
          if (alreadyHas) return { isOpen: true };
          const newItems: CartItem[] = [];
          for (const { product, quantity } of products) {
            newItems.push({ product, quantity, comboId: combo.id });
          }
          return {
            items: [...s.items, ...newItems],
            combos: [...s.combos, combo],
            isOpen: true,
          };
        }),
      removeCombo: (comboId) =>
        set((s) => ({
          items: s.items.filter((i) => i.comboId !== comboId),
          combos: s.combos.filter((c) => c.id !== comboId),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.product.id === id ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [], combos: [] }),
      setOpen: (isOpen) => set({ isOpen }),
      toggleWish: (id) =>
        set((s) => ({
          wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id],
        })),
    }),
    { name: "voltra-cart" },
  ),
);

export const lineUnitPrice = (item: CartItem) => {
  const base = item.product.price;
  if (!item.subscription) return base;
  return +(base * (1 - item.subscription.discountPercent / 100)).toFixed(2);
};

export const lineSubtotal = (item: CartItem) => lineUnitPrice(item) * item.quantity;

export const comboSavingsTotal = (combos: CartCombo[]) =>
  combos.reduce((sum, c) => sum + (c.savings || 0), 0);

// Shipping settings cache — updated by useShippingSettings() so cartTotals stays sync.
export const shippingSettings = { freeThreshold: 50, baseCost: 4.9 };

export const cartTotals = (items: CartItem[], combos: CartCombo[] = []) => {
  const itemsSubtotal = items.reduce((sum, i) => sum + lineSubtotal(i), 0);
  const discount = comboSavingsTotal(combos);
  const subtotal = Math.max(0, itemsSubtotal - discount);
  const { freeThreshold, baseCost } = shippingSettings;
  const shipping = subtotal === 0 || subtotal > freeThreshold ? 0 : baseCost;
  const total = subtotal + shipping;
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal, itemsSubtotal, discount, shipping, total, count };
};

