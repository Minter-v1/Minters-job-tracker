import type { SVGProps } from "react";
type P = SVGProps<SVGSVGElement>;
function I({ children, ...props }: P) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>; }
export const BriefcaseIcon = (p: P) => <I {...p}><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M3 12.5c4.9 2 13.1 2 18 0M10 13h4"/></I>;
export const PlusIcon = (p: P) => <I {...p}><path d="M12 5v14M5 12h14"/></I>;
export const SearchIcon = (p: P) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></I>;
export const CalendarIcon = (p: P) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></I>;
export const CheckIcon = (p: P) => <I {...p}><path d="m5 12 4 4L19 6"/></I>;
export const ClockIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>;
export const ExternalIcon = (p: P) => <I {...p}><path d="M14 4h6v6M10 14 20 4M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/></I>;
export const CloseIcon = (p: P) => <I {...p}><path d="m6 6 12 12M18 6 6 18"/></I>;
export const TrashIcon = (p: P) => <I {...p}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></I>;
export const ChevronIcon = (p: P) => <I {...p}><path d="m9 6 6 6-6 6"/></I>;
export const SortIcon = (p: P) => <I {...p}><path d="M8 6h10M8 12h7M8 18h4M5 4v16M2.5 17.5 5 20l2.5-2.5"/></I>;
