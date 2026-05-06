import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/data/catalog";

export type CartItem = {
  product: Product;
  quantity: number;
  flavor?: string;
  size?: string;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  wishlist: string[];
  add: (product: Product, opts?: { flavor?: string; size?: string; quantity?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  toggleWish: (id: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      wishlist: [],
      add: (product, opts) =>
        set((s) => {
          const existing = s.items.find(
            (i) => i.product.id === product.id && i.flavor === opts?.flavor && i.size === opts?.size,
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + (opts?.quantity ?? 1) } : i,
              ),
              isOpen: true,
            };
          }
          return {
            items: [...s.items, { product, quantity: opts?.quantity ?? 1, flavor: opts?.flavor, size: opts?.size }],
            isOpen: true,
          };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.product.id === id ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
      setOpen: (isOpen) => set({ isOpen }),
      toggleWish: (id) =>
        set((s) => ({
          wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id],
        })),
    }),
    { name: "voltra-cart" },
  ),
);

export const cartTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = subtotal > 50 || subtotal === 0 ? 0 : 4.9;
  const total = subtotal + shipping;
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal, shipping, total, count };
};
