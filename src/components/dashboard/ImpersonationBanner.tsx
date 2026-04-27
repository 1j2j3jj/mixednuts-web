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
    <div className="relative z-50 flex items-center justify-between bg-amber-500 px-6 py-2 text-sm font-medium text-amber-950">
      <span>
        <span className="mr-2 opacity-70">閲覧中:</span>
        <strong>{clientLabel}</strong>
        <span className="ml-2 opacity-70">をオーナーとして閲覧しています</span>
      </span>
      <a
        href={exitHref}
        className="rounded border border-amber-700 bg-amber-600 px-3 py-0.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        閲覧を終了
      </a>
    </div>
  );
}
