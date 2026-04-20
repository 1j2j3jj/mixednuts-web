import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost";

type ButtonInkProps = {
  variant?: Variant;
  href?: string;
  children: ReactNode;
  arrow?: boolean;
  className?: string;
};

export default function ButtonInk({ variant = "primary", href, children, arrow = true, className = "" }: ButtonInkProps) {
  const cls = `btn-ink ${variant} ${className}`.trim();
  const content = (
    <>
      {children}
      {arrow && <span className="arrow">↗</span>}
    </>
  );
  if (href) {
    return <Link href={href} className={cls}>{content}</Link>;
  }
  return <button type="submit" className={cls}>{content}</button>;
}
