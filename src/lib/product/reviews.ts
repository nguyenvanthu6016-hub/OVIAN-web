import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Review } from "@/lib/commerce/types";

/**
 * Reviews customers left on OVIAN's Shopee listing, transcribed by hand from screenshots into
 * content/reviews/*.json. Sapo has no review API and the Shopee one is not approved yet, so until
 * it is, this is the only real review source the shop has.
 *
 * The files are data, not code: the owner adds a product by dropping in one more JSON file. That
 * means a hand-edited file can be malformed, so every file is validated and a bad one is skipped
 * with a warning rather than taking the product page down with it.
 *
 * Read once per process at first use. There are a few dozen reviews in total; re-reading them per
 * request would be work for nothing, and the files only change on deploy.
 */

const reviewSchema = z.object({
  author: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  date: z.string().datetime({ offset: true }).nullable(),
  variant: z.string().min(1).optional(),
  attributes: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).default([]),
  body: z.string().min(1),
  mediaCount: z.number().int().min(0).nullable().default(null),
  helpfulVotes: z.number().int().min(0).optional(),
  needsCheck: z.string().optional(),
});

const fileSchema = z.object({
  productHandle: z.string().min(1),
  productName: z.string().min(1),
  sku: z.string().optional(),
  source: z.literal("shopee"),
  transcribedAt: z.string().optional(),
  status: z.enum(["pending", "live"]).optional(),
  reviews: z.array(reviewSchema).min(1),
});

let cache: Map<string, Review[]> | null = null;

function load(): Map<string, Review[]> {
  // Resolved per read, not once at import: the module is loaded long before anything calls it,
  // and a path frozen at import time is a path that can be wrong.
  const dir = join(process.cwd(), "content", "reviews");
  const byHandle = new Map<string, Review[]>();
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    // No folder in this deployment: the shop simply shows no imported reviews.
    return byHandle;
  }
  for (const file of files) {
    let parsed: z.infer<typeof fileSchema>;
    try {
      parsed = fileSchema.parse(JSON.parse(readFileSync(join(dir, file), "utf8")));
    } catch (e) {
      console.warn(`[reviews] skipping ${file}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    byHandle.set(
      parsed.productHandle,
      parsed.reviews.map((r, i) => ({
        id: `${parsed.productHandle}-shopee-${i}`,
        productId: parsed.productHandle,
        author: r.author,
        rating: r.rating,
        body: r.body,
        createdAt: r.date,
        ...(r.variant ? { variant: r.variant } : {}),
        ...(r.attributes.length ? { attributes: r.attributes } : {}),
        source: "shopee" as const,
      })),
    );
  }
  return byHandle;
}

/** Reviews transcribed from the marketplace for this product, newest first; undated ones last. */
export function importedReviews(productHandle: string): Review[] {
  cache ??= load();
  const found = cache.get(productHandle);
  if (!found) return [];
  return [...found].sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Test seam: the file cache is read once per process, so tests need a way to drop it. */
export function resetImportedReviews(): void {
  cache = null;
}
