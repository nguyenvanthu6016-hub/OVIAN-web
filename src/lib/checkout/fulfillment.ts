/**
 * Store pickup (click & collect, cash at the store) is off unless STORE_PICKUP_ENABLED=true.
 * OVIAN decided on 2026-11-12 to offer home delivery (COD) only. The pickup code path is kept so it
 * can be switched back on without code changes.
 */
export function storePickupEnabled(): boolean {
  return process.env.STORE_PICKUP_ENABLED === "true";
}
