"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR and hydration, true afterwards: for UI that depends on browser storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
