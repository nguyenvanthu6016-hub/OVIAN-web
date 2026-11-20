import Image from "next/image";
import Link from "next/link";
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
            <span className="flex items-end justify-between gap-4">
              <span className="max-w-sm text-small text-ink-muted">{dict.home.noRooms}</span>
              <DoorSwing index={0} />
            </span>
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
              <span className="relative flex items-end justify-between gap-2">
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

/**
 * Furniture drawn into the room, the way a plan shows it: a bed in the bedroom, a hob in the
 * kitchen. It fills the empty floor without competing with the room name, and needs no photography.
 * Keyed by the Sapo collection handle; an unknown room gets a plain rug outline.
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
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(
        "pointer-events-none absolute bottom-0 right-0 text-green/30 transition-[color,transform] duration-300 group-hover:text-green/45",
        large ? "w-[62%] max-w-[22rem]" : "w-[72%] max-w-[11rem]",
      )}
    >
      {art}
    </svg>
  );
}

/** Both spellings a room can have: Sapo uses "phong-bep"/"do-dung-ngoai-troi", the sample catalogue "bep"/"ban-cong". */
const ROOM_ALIASES: Record<string, string> = { bep: "phong-bep", "ban-cong": "do-dung-ngoai-troi" };

/** Top-down outlines, drawn to sit in the bottom-right corner of a 120×92 room. */
const FURNITURE: Record<string, React.ReactNode> = {
  // Bed with two pillows and a folded throw.
  "phong-ngu": (
    <>
      <rect x="34" y="20" width="62" height="70" rx="4" />
      <path d="M34 36h62" />
      <rect x="39" y="24" width="24" height="9" rx="2.5" />
      <rect x="67" y="24" width="24" height="9" rx="2.5" />
      <path d="M34 70h62" strokeDasharray="3 3" />
      <rect x="18" y="58" width="12" height="16" rx="2" />
    </>
  ),
  // Sofa facing a low table.
  "phong-khach": (
    <>
      <path d="M28 90V48a5 5 0 0 1 5-5h54a5 5 0 0 1 5 5v42" />
      <path d="M28 58h64" />
      <path d="M44 58v32M76 58v32" strokeDasharray="3 3" />
      <rect x="40" y="16" width="40" height="18" rx="3" />
    </>
  ),
  // Counter run with a four-ring hob and a sink.
  "phong-bep": (
    <>
      <rect x="22" y="56" width="76" height="34" rx="3" />
      <circle cx="42" cy="68" r="5" />
      <circle cx="58" cy="68" r="5" />
      <circle cx="42" cy="82" r="5" />
      <circle cx="58" cy="82" r="5" />
      <rect x="72" y="63" width="20" height="20" rx="3" />
      <path d="M82 63v-9" strokeDasharray="3 3" />
    </>
  ),
  // Bath, basin and a shower drain.
  "phong-tam": (
    <>
      <rect x="20" y="58" width="48" height="32" rx="8" />
      <circle cx="30" cy="74" r="3" />
      <circle cx="90" cy="76" r="13" />
      <path d="M90 63v-7" strokeDasharray="3 3" />
      <rect x="76" y="22" width="28" height="22" rx="3" strokeDasharray="4 3" />
    </>
  ),
  // Desk with a chair pulled up to it.
  "goc-lam-viec": (
    <>
      <rect x="26" y="54" width="72" height="22" rx="3" />
      <rect x="44" y="58" width="22" height="14" rx="2" strokeDasharray="3 3" />
      <circle cx="62" cy="86" r="10" />
      <path d="M26 54V40" strokeDasharray="3 3" />
    </>
  ),
  // A bench and two plant pots on a balcony.
  "do-dung-ngoai-troi": (
    <>
      <rect x="24" y="62" width="58" height="16" rx="3" />
      <path d="M24 70h58" strokeDasharray="3 3" />
      <circle cx="96" cy="60" r="9" />
      <circle cx="96" cy="84" r="6" />
      <path d="M24 90h80" strokeDasharray="4 4" />
    </>
  ),
  default: (
    <>
      <rect x="28" y="44" width="68" height="46" rx="4" strokeDasharray="5 4" />
      <path d="M28 66h68" strokeDasharray="3 3" />
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
