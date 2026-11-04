"use client";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { cartDrawer, cartSubtotal, useCart, useCartDrawerOpen } from "@/lib/client/stores";
import { Drawer } from "@/components/ui/drawer";
import { ButtonLink } from "@/components/ui/primitives";
import { CartLines } from "./cart-lines";

export function CartDrawer({ locale, dict }: { locale: Locale; dict: Pick<Dictionary, "cart" | "product" | "common"> }) {
  const open = useCartDrawerOpen();
  const cart = useCart();
  const close = () => cartDrawer.close();
  return (
    <Drawer
      id="cart-drawer"
      open={open}
      onClose={close}
      title={dict.cart.drawerTitle}
      closeLabel={dict.common.close}
      footer={
        cart.lines.length ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-small text-ink-muted">{dict.cart.subtotal}</span>
              <span className="text-subheading text-ink">{formatPrice(cartSubtotal(cart), locale)}</span>
            </div>
            <p className="text-caption text-ink-muted">{dict.cart.shipping}: {dict.cart.shippingAtCheckout}</p>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href={routes.cart(locale)} variant="secondary" onClick={close}>{dict.cart.viewCart}</ButtonLink>
              <ButtonLink href={routes.checkout(locale)} onClick={close}>{dict.cart.checkout}</ButtonLink>
            </div>
          </div>
        ) : null
      }
    >
      <div className="px-4">
        {cart.lines.length ? (
          <CartLines lines={cart.lines} locale={locale} dict={dict} compact onNavigate={close} />
        ) : (
          <div className="py-10">
            <p className="text-subheading text-green">{dict.cart.empty}</p>
            <p className="mt-1 text-ink-muted">{dict.cart.emptyHint}</p>
            <ButtonLink href={routes.products(locale)} className="mt-5" onClick={close}>{dict.cart.continue}</ButtonLink>
          </div>
        )}
      </div>
    </Drawer>
  );
}
