import "server-only";
import { commerceMode, getCommerce } from "@/lib/commerce";
import type { CreateOrderInput, Order } from "@/lib/commerce/types";
import { sheetsConfigured, sheetsOrders } from "./sheets";

/**
 * Where orders go. The catalogue always comes from the commerce provider (Sapo or mock);
 * orders can go somewhere else:
 * - mock:   simulated orders (Mock Mode only)
 * - sheets: the owner's Google Sheet via Apps Script (default in live mode)
 * - sapo:   Sapo Admin API orders (needs an order-capable Sapo plan)
 */
export type OrderBackendName = "mock" | "sheets" | "sapo";

export interface OrderBackend {
  readonly name: OrderBackendName;
  createOrder(input: CreateOrderInput): Promise<Order>;
  findOrderByCheckoutId(checkoutId: string): Promise<Order | null>;
  getOrder(ref: string): Promise<Order | null>;
}

export function orderBackendName(): OrderBackendName {
  const v = process.env.ORDER_BACKEND?.trim();
  if (v === "sapo" || v === "sheets") return v;
  // Mock catalogue defaults to simulated orders; a live catalogue never takes simulated orders.
  return commerceMode() === "mock" ? "mock" : "sheets";
}

/** Whether checkout may submit orders right now. Real order writes need an explicit switch. */
export function ordersEnabled(): boolean {
  switch (orderBackendName()) {
    case "mock":
      return true;
    case "sheets":
      return process.env.ORDERS_ENABLED === "true" && sheetsConfigured();
    case "sapo":
      return process.env.ORDERS_ENABLED === "true" || process.env.SAPO_ALLOW_ORDER_WRITES === "true";
  }
}

export function getOrderBackend(): OrderBackend {
  const name = orderBackendName();
  if (name === "sheets") return { name, ...sheetsOrders };
  const c = getCommerce();
  return {
    name,
    createOrder: (i) => c.createOrder(i),
    findOrderByCheckoutId: (id) => c.findOrderByCheckoutId(id),
    getOrder: (ref) => c.getOrder(ref),
  };
}
