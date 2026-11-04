import "server-only";
import type { CommerceProvider } from "./types";
import { mockProvider } from "./mock/provider";
import { sapoProvider } from "./sapo/provider";

export type CommerceMode = "mock" | "live";

export function commerceMode(): CommerceMode {
  return process.env.COMMERCE_MODE === "live" ? "live" : "mock";
}

/** Single entry point for pages and route handlers. Live mode never falls back to mock data. */
export function getCommerce(): CommerceProvider {
  return commerceMode() === "live" ? sapoProvider : mockProvider;
}

export * from "./types";
