import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import type { NavSpace } from "@/components/layout/header-client";

/**
 * The OVIAN signature element: the home as an architectural plan. Walls are the green
 * container showing through the grid gaps; each room opens its catalogue.
 * Rooms come from Sapo top-level collections, ordered by floor area (then product count).
 */
export function FloorPlan({ spaces, locale, dict }: { spaces: NavSpace[]; locale: Locale; dict: Pick<Dictionary, "home" | "common"> }) {
  const rooms = [...spaces].sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0) || b.count - a.count);
  if (!rooms.length) return null;
  return (
    <nav aria-label={dict.home.planAria}>
      <ul className="floorplan">
        {rooms.map((r, i) => (
          <li key={r.handle} className="contents">
            <Link
              href={routes.space(locale, r.handle)}
              className="group relative flex min-h-[8.5rem] flex-col justify-between bg-surface p-4 transition-colors duration-150 hover:bg-surface-alt focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink md:p-5"
              style={i < 6 ? { gridArea: `r${i + 1}` } : { gridColumn: "1 / -1" }}
            >
              <span>
                <span lang={r.lang} className={i === 0 ? "block text-heading font-semibold text-green" : "block text-subheading text-green"}>
                  {r.name}
                </span>
                <span className="mt-0.5 block text-caption text-ink-muted">{t(dict.common.items, { count: r.count })}</span>
              </span>
              <span className="flex items-end justify-between gap-2">
                {r.areaM2 ? <span className="text-caption text-ink-muted">{t(dict.home.area, { area: r.areaM2 })}</span> : <span />}
                <DoorSwing index={i} />
              </span>
              {/* The yellow "you are here" pin appears on hover/focus — accent used as a small point only. */}
              <span aria-hidden="true" className="absolute right-4 top-4 size-2.5 rounded-full bg-yellow opacity-0 ring-2 ring-green transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Quarter-circle door swing, the plan-drawing convention; orientation varies per room. */
function DoorSwing({ index }: { index: number }) {
  const rot = [0, 90, 180, 270][index % 4];
  return (
    <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34" className="text-green/60" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M2 32V2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 2a30 30 0 0 1 30 30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
}
