'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartItem = {
  id: string;
  title: string;
  priceCents: number;
  image?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (id: string) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  clear: () => void;
  count: () => number;
  totalCents: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const copy = get().items.slice();
        const i = copy.findIndex(x => x.id === item.id);
        if (i >= 0) copy[i].qty += qty; else copy.push({ ...item, qty });
        set({ items: copy });
      },
      remove: (id) => {
        const filtered = get().items.filter(i => i.id !== id);
        set({ items: filtered });
      },
      inc: (id) => {
        const updated = get().items.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
        set({ items: updated });
      },
      dec: (id) => {
        const item = get().items.find(i => i.id === id);
        if (item && item.qty === 1) {
          // If quantity is 1, remove item completely
          get().remove(id);
        } else {
          const updated = get().items.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i);
          set({ items: updated });
        }
      },
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.qty, 0),
      totalCents: () => get().items.reduce((s, i) => s + i.priceCents * i.qty, 0),
    }),
    {
      name: 'gastroshop-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);

export const formatPrice = (cents: number, currency: 'RUB'|'USD'|'EUR' = 'RUB') =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(cents / 100);

