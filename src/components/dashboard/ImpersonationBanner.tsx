/**
 * ImpersonationBanner — server component, rendered when admin is viewing
 * a client workspace via mn_impersonate cookie.
 *
 * Shown at the very top of the page (above the sticky header) so it is
 * always visible regardless of scroll position.
 *
 * Props are passed from layout.tsx which reads x-impersonated-slug and
 * resolves the client label from CLIENTS config.
 */

interface Props {
  clientLabel: string;
  exitHref: string;
}

export default function ImpersonationBanner({ clientLabel, exitHref }: Props) {
  return (
    <div
      // "impersonation-banner" is a plain-CSS selector hook (not a Tailwind
      // utility) for the ITEM 2 focus-ring override in globals.css — see
      // the comment there for why the global :focus-visible ring (1.71:1
      // against this banner's own bg-amber-500) needed a scoped fix.
      className="impersonation-banner relative z-50 flex items-center justify-between bg-amber-500 px-6 py-2 text-sm font-medium text-amber-950"
    >
      <span>
        <span className="mr-2 opacity-70">閲覧中:</span>
        <strong>{clientLabel}</strong>
        <span className="ml-2 opacity-70">をオーナーとして閲覧しています</span>
      </span>
      {/* E-1 contrast fix (2026-07-25): white text on bg-amber-600 measured
          3.20:1 — below the 4.5:1 normal-text floor (12px semibold does not
          qualify as "large text"). Bumped fill to amber-700 (5.03:1,
          verified) and the border/hover a step further so the button still
          reads as a distinct raised control against the banner's own
          bg-amber-500. */}
      <a
        href={exitHref}
        className="rounded-md border border-amber-800 bg-amber-700 px-3 py-0.5 text-xs font-semibold text-white hover:bg-amber-800"
      >
        閲覧を終了
      </a>
    </div>
  );
}
