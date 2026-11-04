"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/client/use-hydrated";
import { provinces, provinceName } from "@/lib/checkout/provinces";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { Button, ButtonLink, Field, Notice, inputClass } from "@/components/ui/primitives";

/**
 * MOCK MODE ONLY. A local, browser-only preview of account screens. It does not authenticate anyone
 * and never stores a password; Live Mode renders the "accounts not available" notice instead.
 */
interface MockProfile { name: string; email: string; phone: string; addresses: { id: string; provinceCode: string; ward: string; street: string }[] }
const KEY = "ovian.mockAccount.v1";
const listeners = new Set<() => void>();
let cache: MockProfile | null | undefined;
const read = (): MockProfile | null => {
  if (cache !== undefined) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "null") as MockProfile | null; } catch { cache = null; }
  return cache;
};
const write = (p: MockProfile | null) => {
  cache = p;
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};
const useProfile = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => null);

type D = Pick<Dictionary, "account" | "checkout" | "common" | "wishlist" | "order">;

export function MockAuthForm({ locale, dict, mode }: { locale: Locale; dict: D; mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        write({ name: name.trim() || email.split("@")[0]!, email: email.trim(), phone: "", addresses: read()?.addresses ?? [] });
        router.push(routes.account(locale));
      }}
    >
      <Notice tone="sample">{dict.account.mockNote}</Notice>
      {mode === "register" ? (
        <Field id="acc-name" label={dict.checkout.fullName}>
          <input id="acc-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
      ) : null}
      <Field id="acc-email" label={dict.checkout.email}>
        <input id="acc-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
      </Field>
      <Button type="submit" size="lg">{mode === "login" ? dict.account.login : dict.account.register}</Button>
      <p className="text-small text-ink-muted">
        {mode === "login" ? dict.account.noAccount : dict.account.haveAccount}{" "}
        <Link href={mode === "login" ? routes.register(locale) : routes.login(locale)} className="font-semibold text-green underline underline-offset-4">
          {mode === "login" ? dict.account.register : dict.account.login}
        </Link>
      </p>
    </form>
  );
}

export function MockAccountDashboard({ locale, dict }: { locale: Locale; dict: D }) {
  const profile = useProfile();
  const hydrated = useHydrated();
  const [saved, setSaved] = useState(false);
  const [addr, setAddr] = useState({ provinceCode: "", ward: "", street: "" });
  if (!hydrated) return <div className="h-40" aria-busy="true" />;
  if (!profile) {
    return (
      <div className="space-y-4">
        <Notice tone="sample">{dict.account.mockNote}</Notice>
        <div className="flex gap-3">
          <ButtonLink href={routes.login(locale)}>{dict.account.login}</ButtonLink>
          <ButtonLink href={routes.register(locale)} variant="secondary">{dict.account.register}</ButtonLink>
        </div>
      </div>
    );
  }
  const section = "rounded-lg border border-line bg-paper p-5 md:p-6";
  return (
    <div className="space-y-6">
      <Notice tone="sample">{dict.account.mockNote}</Notice>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-subheading text-green">{t(dict.account.welcome, { name: profile.name })}</p>
        <Button variant="ghost" onClick={() => write(null)}>{dict.account.logout}</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={section} aria-labelledby="acc-profile">
          <h2 id="acc-profile" className="mb-4 text-subheading">{dict.account.profile}</h2>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            write({ ...profile, name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? "") });
            setSaved(true);
          }}>
            <Field id="p-name" label={dict.checkout.fullName}><input id="p-name" name="name" className={inputClass} defaultValue={profile.name} /></Field>
            <Field id="p-phone" label={dict.checkout.phone}><input id="p-phone" name="phone" type="tel" className={inputClass} defaultValue={profile.phone} /></Field>
            <Button type="submit" variant="secondary">{dict.account.saveProfile}</Button>
            {saved ? <p role="status" className="text-caption text-green">{dict.account.savedProfile}</p> : null}
          </form>
        </section>
        <section className={section} aria-labelledby="acc-addr">
          <h2 id="acc-addr" className="mb-4 text-subheading">{dict.account.addresses}</h2>
          {profile.addresses.length ? (
            <ul className="mb-4 space-y-2 text-small">
              {profile.addresses.map((a) => <li key={a.id} className="rounded-sm bg-surface-alt px-3 py-2">{[a.street, a.ward, provinceName(a.provinceCode)].join(", ")}</li>)}
            </ul>
          ) : <p className="mb-4 text-small text-ink-muted">{dict.account.noAddresses}</p>}
          <form className="grid gap-3" onSubmit={(e) => {
            e.preventDefault();
            if (!addr.provinceCode || !addr.street) return;
            write({ ...profile, addresses: [...profile.addresses, { id: crypto.randomUUID(), ...addr }] });
            setAddr({ provinceCode: "", ward: "", street: "" });
          }}>
            <label htmlFor="a-prov" className="sr-only">{dict.checkout.province}</label>
            <select id="a-prov" className={inputClass} value={addr.provinceCode} onChange={(e) => setAddr({ ...addr, provinceCode: e.target.value })}>
              <option value="">{dict.checkout.provincePlaceholder}</option>
              {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <label htmlFor="a-ward" className="sr-only">{dict.checkout.ward}</label>
            <input id="a-ward" className={inputClass} placeholder={dict.checkout.ward} value={addr.ward} onChange={(e) => setAddr({ ...addr, ward: e.target.value })} />
            <label htmlFor="a-street" className="sr-only">{dict.checkout.street}</label>
            <input id="a-street" className={inputClass} placeholder={dict.checkout.street} value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
            <Button type="submit" variant="secondary">{dict.account.addAddress}</Button>
          </form>
        </section>
        <section className={section} aria-labelledby="acc-orders">
          <h2 id="acc-orders" className="mb-2 text-subheading">{dict.account.orders}</h2>
          <p className="text-small text-ink-muted">{dict.account.noOrders}</p>
          <Link href={routes.track(locale)} className="mt-3 inline-block text-small font-semibold text-green underline underline-offset-4">{dict.order.track}</Link>
        </section>
        <section className={section} aria-labelledby="acc-wish">
          <h2 id="acc-wish" className="mb-2 text-subheading">{dict.wishlist.title}</h2>
          <p className="text-small text-ink-muted">{dict.wishlist.note}</p>
          <Link href={routes.wishlist(locale)} className="mt-3 inline-block text-small font-semibold text-green underline underline-offset-4">{dict.wishlist.title}</Link>
        </section>
      </div>
    </div>
  );
}
