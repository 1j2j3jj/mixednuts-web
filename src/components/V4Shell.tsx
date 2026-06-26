import NavV4 from "@/components/NavV4";
import FooterV4 from "@/components/FooterV4";
import SiteMotion from "@/components/SiteMotion";

/**
 * Shared shell for every v4 marketing page. Provides the `.mn-v4` scope
 * (dark background + scoped design tokens), the dark nav + footer chrome,
 * and the motion engine (which also renders the scroll-progress bar and
 * custom cursor). Pages render only their own sections as children.
 */
export default function V4Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mn-v4">
      <NavV4 />
      {children}
      <FooterV4 />
      <SiteMotion />
    </div>
  );
}
