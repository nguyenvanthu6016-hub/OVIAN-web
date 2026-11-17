import { z } from "zod";
import { provinces } from "./provinces";

const provinceCodes = provinces.map((p) => p.code) as unknown as [string, ...string[]];

/** Vietnamese phone: 10 digits starting with 0 (also accepts +84 / 84 prefix). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, "").replace(/^\+?84/, "0"))
  .pipe(z.string().regex(/^0\d{9}$/, "phone"));

export const cartLineSchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99),
  /** Unit price the customer saw — used only to detect changes, never trusted for totals */
  seenPrice: z.number().int().nonnegative().optional(),
});

export const quoteRequestSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  couponCode: z.string().trim().max(40).optional().nullable(),
  fulfillment: z.enum(["delivery", "pickup"]),
  provinceCode: z.enum(provinceCodes).optional().nullable(),
});

const deliveryAddressSchema = z.object({
  provinceCode: z.enum(provinceCodes),
  ward: z.string().trim().min(2).max(80),
  street: z.string().trim().min(3).max(160),
});

export const orderRequestSchema = z
  .object({
    checkoutId: z.string().uuid(),
    locale: z.enum(["vi", "en"]),
    lines: z.array(cartLineSchema).min(1).max(50),
    couponCode: z.string().trim().max(40).optional().nullable(),
    fulfillment: z.enum(["delivery", "pickup"]),
    customer: z.object({
      fullName: z.string().trim().min(2).max(80),
      phone: phoneSchema,
      email: z.union([z.literal(""), z.string().trim().email().max(120)]).optional(),
    }),
    address: z
      .object({ provinceCode: z.string(), ward: z.string(), street: z.string() })
      .partial()
      .optional()
      .nullable(),
    note: z.string().trim().max(500).optional(),
    /** Anti-spam: signed token issued by the checkout page. */
    token: z.string().max(200).optional(),
    /** Anti-spam honeypot: hidden on the page, so a real customer always leaves it empty. */
    website: z.string().max(200).optional(),
    /** Total the customer confirmed; server rejects if it no longer matches */
    confirmedTotal: z.number().int().nonnegative(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "delivery") {
      const r = deliveryAddressSchema.safeParse(v.address ?? {});
      if (!r.success) for (const issue of r.error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: ["address", ...issue.path] });
    }
  });

export const trackRequestSchema = z.object({
  orderRef: z.string().trim().min(3).max(20).regex(/^#?[A-Za-z0-9-]+$/),
  phone: phoneSchema,
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type OrderRequest = z.infer<typeof orderRequestSchema>;
