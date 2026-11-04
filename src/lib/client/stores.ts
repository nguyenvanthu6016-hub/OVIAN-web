"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed stores (no PII). Cart, wishlist and recently-viewed live only in this browser.
 */
function createLocalStore<T>(key: string, initial: T) {
  let value: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) value = JSON.parse(raw) as T;
    } catch {
      /* storage blocked or corrupt — start empty */
    }
  };

  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try {
        value = e.newValue ? (JSON.parse(e.newValue) as T) : initial;
      } catch {
        value = initial;
      }
      emit();
    });
  }

  return {
    get(): T {
      load();
      return value;
    },
    set(next: T | ((prev: T) => T)) {
      load();
      value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore quota / private mode */
      }
      emit();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    initial,
  };
}

function useStore<T>(store: ReturnType<typeof createLocalStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

/* ---------- Cart ---------- */
export interface CartLine {
  variantId: string;
  productId: string;
  handle: string;
  name: string;
  variantTitle: string;
  /** price shown when added — server re-prices at checkout */
  price: number;
  compareAt: number | null;
  image: string | null;
  quantity: number;
  maxQuantity: number | null;
}

export interface CartState {
  lines: CartLine[];
  couponCode: string | null;
}

export const cartStore = createLocalStore<CartState>("ovian.cart.v1", { lines: [], couponCode: null });
export const useCart = () => useStore(cartStore);

export const cartActions = {
  add(line: Omit<CartLine, "quantity">, quantity: number) {
    cartStore.set((s) => {
      const existing = s.lines.find((l) => l.variantId === line.variantId);
      const cap = (q: number) => Math.max(1, Math.min(99, line.maxQuantity ?? 99, q));
      const lines = existing
        ? s.lines.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: cap(l.quantity + quantity) } : l))
        : [...s.lines, { ...line, quantity: cap(quantity) }];
      return { ...s, lines };
    });
  },
  setQuantity(variantId: string, quantity: number) {
    cartStore.set((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(99, l.maxQuantity ?? 99, quantity)) } : l)),
    }));
  },
  remove(variantId: string) {
    cartStore.set((s) => ({ ...s, lines: s.lines.filter((l) => l.variantId !== variantId) }));
  },
  setCoupon(code: string | null) {
    cartStore.set((s) => ({ ...s, couponCode: code }));
  },
  /** Apply server quote corrections (prices, removed lines, reduced quantities). */
  reconcile(serverLines: { variantId: string; quantity: number; unitPrice: number }[]) {
    cartStore.set((s) => ({
      ...s,
      lines: s.lines
        .filter((l) => serverLines.some((x) => x.variantId === l.variantId))
        .map((l) => {
          const x = serverLines.find((y) => y.variantId === l.variantId)!;
          return { ...l, quantity: x.quantity, price: x.unitPrice };
        }),
    }));
  },
  clear() {
    cartStore.set({ lines: [], couponCode: null });
  },
};

export const cartCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity * l.price, 0);

/* ---------- Wishlist & recently viewed (product ids only) ---------- */
export const wishlistStore = createLocalStore<string[]>("ovian.wishlist.v1", []);
export const useWishlist = () => useStore(wishlistStore);
export const toggleWishlist = (id: string) =>
  wishlistStore.set((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, 100)));

export const recentStore = createLocalStore<string[]>("ovian.recent.v1", []);
export const useRecent = () => useStore(recentStore);
export const pushRecent = (id: string) => recentStore.set((ids) => [id, ...ids.filter((x) => x !== id)].slice(0, 12));

/* ---------- Cart drawer (memory only) ---------- */
let drawerOpen = false;
const drawerListeners = new Set<() => void>();
export const cartDrawer = {
  open() { drawerOpen = true; drawerListeners.forEach((l) => l()); },
  close() { drawerOpen = false; drawerListeners.forEach((l) => l()); },
};
export const useCartDrawerOpen = () =>
  useSyncExternalStore(
    (l) => { drawerListeners.add(l); return () => drawerListeners.delete(l); },
    () => drawerOpen,
    () => false,
  );
