import type { SVGProps } from "react";

/** Functional UI icons only (1.5px line). OVIAN has no brand symbol — never use these as one. */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const IconSearch = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Base>;
export const IconBag = (p: P) => <Base {...p}><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Base>;
export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Base {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={filled ? "currentColor" : "none"} /></Base>
);
export const IconMenu = (p: P) => <Base {...p}><path d="M4 7h16M4 12h16M4 17h10" /></Base>;
export const IconClose = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>;
export const IconChevronRight = (p: P) => <Base {...p}><path d="m9 6 6 6-6 6" /></Base>;
export const IconChevronLeft = (p: P) => <Base {...p}><path d="m15 6-6 6 6 6" /></Base>;
export const IconChevronDown = (p: P) => <Base {...p}><path d="m6 9 6 6 6-6" /></Base>;
export const IconPlus = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const IconMinus = (p: P) => <Base {...p}><path d="M5 12h14" /></Base>;
export const IconUser = (p: P) => <Base {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" /></Base>;
export const IconFilter = (p: P) => <Base {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Base>;
export const IconCheck = (p: P) => <Base {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>;
export const IconAlert = (p: P) => <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.2v.3" /></Base>;
export const IconStore = (p: P) => <Base {...p}><path d="M4 10v10h16V10M3 10l2-6h14l2 6z" /><path d="M10 20v-5h4v5" /></Base>;
export const IconTruck = (p: P) => <Base {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></Base>;
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Base {...p}><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill={filled ? "currentColor" : "none"} /></Base>
);
export const IconZoom = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" /></Base>;
