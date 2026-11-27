import Image from "next/image";
import { ChromeLink as Link } from "@/components/ui/chrome-link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { cx } from "@/components/ui/primitives";
import type { NavSpace } from "@/components/layout/header-client";

/**
 * The OVIAN signature element: the home as an architectural plan. Walls are the green
 * container showing through the grid gaps; each room opens its catalogue.
 * Rooms come from Sapo top-level collections, ordered by floor area (then product count).
 */
export function FloorPlan({ spaces, locale, dict }: { spaces: NavSpace[]; locale: Locale; dict: Pick<Dictionary, "home" | "common"> }) {
  const rooms = [...spaces].sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0) || b.count - a.count);
  if (!rooms.length) {
    // No room collections in the store yet: one open-plan tile leading to the full catalogue.
    return (
      <nav aria-label={dict.home.planAria}>
        <div className="rounded-lg bg-green p-[2px]">
          <Link
            href={routes.products(locale)}
            className="flex min-h-[17rem] flex-col justify-between rounded-[calc(var(--radius-lg)-2px)] bg-surface p-5 transition-colors duration-150 hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink md:p-6"
          >
            <span className="block text-heading font-semibold text-green">{dict.common.allProducts}</span>
            <span className="max-w-sm text-small text-ink-muted">{dict.home.noRooms}</span>
          </Link>
        </div>
      </nav>
    );
  }
  return (
    <nav aria-label={dict.home.planAria}>
      <ul className="floorplan" data-rooms={rooms.length}>
        {rooms.map((r, i) => (
          <li key={r.handle} className="contents">
            <Link
              href={routes.space(locale, r.handle)}
              className="group relative flex min-h-[8.5rem] flex-col justify-between bg-surface p-4 transition-colors duration-150 hover:bg-surface-alt focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink md:p-5"
              style={i < 6 ? { gridArea: `r${i + 1}` } : { gridColumn: "1 / -1" }}
            >
              {r.photo ? <RoomPhoto url={r.photo.url} large={i === 0} /> : <RoomFurniture handle={r.handle} large={i === 0} />}
              <span className="relative">
                <span lang={r.lang} className={i === 0 ? "block text-heading font-semibold text-green" : "block text-subheading text-green"}>
                  {r.name}
                </span>
                <span className="mt-0.5 block text-caption text-ink-muted">{t(dict.common.items, { count: r.count })}</span>
              </span>
              {r.areaM2 ? <span className="relative text-caption text-ink-muted">{t(dict.home.area, { area: r.areaM2 })}</span> : <span />}
              {/* The yellow "you are here" pin appears on hover/focus — accent used as a small point only. */}
              <span aria-hidden="true" className="absolute right-4 top-4 size-2.5 rounded-full bg-yellow opacity-0 ring-2 ring-green transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Furniture drawn into the room: a bed in the bedroom, a pot on the hob in the kitchen. Seen from
 * the side, the way you would see the thing itself — a plan view asks the reader to decode an
 * outline, and at this size most people simply do not. Needs no photography.
 * Keyed by the Sapo collection handle; an unknown room gets a plain shelf.
 */
function RoomFurniture({ handle, large }: { handle: string; large: boolean }) {
  const base = handle.split("--")[0] ?? "";
  const room = ROOM_ALIASES[base] ?? base;
  const art = FURNITURE[room] ?? FURNITURE.default!;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 92"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(
        "pointer-events-none absolute bottom-0 right-0 text-green/45 transition-[color,transform] duration-300 group-hover:text-green/65",
        large ? "w-[62%] max-w-[22rem]" : "w-[72%] max-w-[11rem]",
      )}
    >
      {art}
    </svg>
  );
}

/** Both spellings a room can have: Sapo uses "phong-bep"/"do-dung-ngoai-troi", the sample catalogue "bep"/"ban-cong". */
const ROOM_ALIASES: Record<string, string> = { bep: "phong-bep", "ban-cong": "do-dung-ngoai-troi" };

/** Side-on drawings, standing on a floor line, sized to sit in the bottom-right of a 120×92 room. */
const FURNITURE: Record<string, React.ReactNode> = {
  // A bed: headboard, pillow, mattress, legs.
  "phong-ngu": (
    <>
      <path d="M6 86h108" />
      <rect x="18" y="38" width="11" height="48" rx="3" />
      <rect x="29" y="58" width="81" height="17" rx="5" />
      <rect x="36" y="46" width="27" height="12" rx="5" />
      <path d="M76 58v17" />
      <path d="M38 75v9M100 75v9" />
    </>
  ),
  // A sofa with two cushions and arms.
  "phong-khach": (
    <>
      <path d="M6 86h108" />
      <rect x="20" y="32" width="82" height="27" rx="7" />
      <rect x="14" y="56" width="94" height="19" rx="7" />
      <rect x="12" y="44" width="12" height="31" rx="6" />
      <rect x="98" y="44" width="12" height="31" rx="6" />
      <path d="M61 34v22" />
      <path d="M24 75v9M98 75v9" />
    </>
  ),
  // A covered pot steaming on the counter.
  "phong-bep": (
    <>
      <rect x="8" y="70" width="104" height="17" rx="3" />
      <path d="M46 48h30v16a6 6 0 0 1-6 6H52a6 6 0 0 1-6-6z" />
      <path d="M40 48h42" />
      <path d="M61 48v-6" />
      <path d="M40 56h-7M82 56h7" />
      <path d="M52 36c4-4-3-8 1-12M70 36c4-4-3-8 1-12" />
      <path d="M20 79h10M92 79h8" />
    </>
  ),
  // A basin with a tap, and a mirror above it.
  "phong-tam": (
    <>
      <path d="M6 86h108" />
      <rect x="44" y="10" width="34" height="23" rx="3" />
      <path d="M30 56h64" />
      <path d="M36 56h52l-6 17a5 5 0 0 1-5 4H47a5 5 0 0 1-5-4z" />
      <path d="M61 77v9" />
      <path d="M56 56v-7a8 8 0 0 1 8-8h7v5" />
    </>
  ),
  // A desk with a clip lamp over it.
  "goc-lam-viec": (
    <>
      <path d="M6 86h108" />
      <rect x="16" y="54" width="94" height="9" rx="3" />
      <path d="M24 63v23M102 63v23" />
      <rect x="22" y="43" width="9" height="11" rx="2" />
      <path d="M27 43c0-11 7-17 17-17" />
      <path d="M36 24h17l-8 12z" />
      <rect x="70" y="40" width="28" height="14" rx="2" />
    </>
  ),
  // A bench with a potted plant beside it.
  "do-dung-ngoai-troi": (
    <>
      <path d="M6 86h108" />
      <path d="M22 58V38h58v20" />
      <path d="M22 47h58" />
      <rect x="18" y="58" width="66" height="9" rx="3" />
      <path d="M26 67v19M76 67v19" />
      <path d="M92 70h20l-3 16H95z" />
      <path d="M102 70c0-9-7-11-7-16M102 70c0-9 7-11 7-16" />
    </>
  ),
  default: (
    <>
      <path d="M6 86h108" />
      <rect x="24" y="30" width="72" height="56" rx="3" />
      <path d="M24 49h72M24 68h72" />
    </>
  ),
};

/**
 * A real room photo, when OVIAN has one: set into the corner of the room the way furniture is
 * drawn into a plan, dissolving towards the top-left so the room name keeps plain ivory behind it.
 */
function RoomPhoto({ url, large }: { url: string; large: boolean }) {
  const fade = "radial-gradient(135% 125% at 100% 100%, #000 18%, rgba(0,0,0,0.55) 48%, transparent 78%)";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src={url}
        alt=""
        fill
        sizes={large ? "(min-width: 768px) 45vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
        unoptimized={url.endsWith(".svg")}
        className="object-cover object-center opacity-80 transition-[opacity,transform] duration-300 group-hover:scale-[1.04] group-hover:opacity-95"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      />
    </span>
  );
}

