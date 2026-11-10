import { getOrderBackend } from "@/lib/orders";
import { trackRequestSchema } from "@/lib/checkout/schema";
import { maskPhone } from "@/lib/checkout/place-order";
import { provinceName } from "@/lib/checkout/provinces";
import { handleError, json, limitFor } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

const last9 = (p: string) => p.replace(/\D/g, "").slice(-9);

/**
 * Guest order tracking. Requires order number AND the phone used on the order.
 * Not-found and phone-mismatch return the same response to prevent enumeration.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`track:${clientIp(req)}`, limitFor(10), 10 * 60_000);
  if (!rl.ok) return json({ error: "rate-limited" }, 429, { "Retry-After": String(rl.retryAfter) });
  const parsed = trackRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "not-found" }, 404);
  try {
    const order = await getOrderBackend().getOrder(parsed.data.orderRef.replace(/^#/, "").toUpperCase());
    if (!order || last9(order.customerPhone) !== last9(parsed.data.phone)) return json({ error: "not-found" }, 404);
    return json({
      order: {
        ref: order.ref,
        createdAt: order.createdAt,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillment: order.fulfillment,
        payment: order.payment,
        lines: order.lines.map((l) => ({ name: l.name, variantTitle: l.variantTitle, quantity: l.quantity, lineTotal: l.lineTotal })),
        subtotal: order.subtotal,
        discount: order.discount,
        shippingFee: order.shippingFee,
        total: order.total,
        phoneMasked: maskPhone(order.customerPhone),
        province: order.shippingAddress ? provinceName(order.shippingAddress.provinceCode) : null,
        simulated: order.simulated,
      },
    });
  } catch (e) {
    return handleError(e, "track");
  }
}
