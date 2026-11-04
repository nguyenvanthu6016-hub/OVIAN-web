import { commerceMode } from "@/lib/commerce";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { MockAccountDashboard, MockAuthForm } from "./mock-account";

/** Live Mode: customer accounts are out of scope — say so plainly and point to guest checkout. */
export function AccountShell({ locale, view, title }: { locale: Locale; view: "dashboard" | "login" | "register"; title: string }) {
  const d = getDictionary(locale);
  const dict = { account: d.account, checkout: d.checkout, common: d.common, wishlist: d.wishlist, order: d.order };
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-8 text-display">{title}</h1>
      {commerceMode() === "live" ? (
        <EmptyState
          title={d.account.unavailableTitle}
          body={d.account.unavailableBody}
          action={<div className="flex flex-wrap gap-3"><ButtonLink href={routes.products(locale)}>{d.cart.continue}</ButtonLink><ButtonLink href={routes.track(locale)} variant="secondary">{d.order.track}</ButtonLink></div>}
        />
      ) : view === "dashboard" ? (
        <MockAccountDashboard locale={locale} dict={dict} />
      ) : (
        <MockAuthForm locale={locale} dict={dict} mode={view} />
      )}
    </div>
  );
}
