import "server-only";
import type { CommerceProvider } from "./types";
import { mockProvider } from "./mock/provider";
import { sapoProvider } from "./sapo/provider";
import { previewUnpublished } from "./sapo/client";

export type CommerceMode = "mock" | "live";

export function commerceMode(): CommerceMode {
  return process.env.COMMERCE_MODE === "live" ? "live" : "mock";
}

/** Live data, but including products not yet published to the Sapo web channel (local preview only). */
export function isUnpublishedPreview(): boolean {
  return commerceMode() === "live" && previewUnpublished();
}

/** Single entry point for pages and route handlers. Live mode never falls back to mock data. */
export function getCommerce(): CommerceProvider {
  return commerceMode() === "live" ? sapoProvider : mockProvider;
}

export * from "./types";
