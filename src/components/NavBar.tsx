import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="nav-v4">
      <Link href="/" className="logo">
        mixed<span className="accent">nuts</span>
      </Link>
      <ul className="nav-links">
        <li><Link href="/about">About</Link></li>
        <li><Link href="/services">Services</Link></li>
        <li><Link href="/works">Works</Link></li>
        <li><Link href="/insights">Insights</Link></li>
        <li><Link href="/team">Team</Link></li>
        <li><Link href="/careers">Careers</Link></li>
        <Link href="/contact" className="nav-cta">Let&apos;s Talk</Link>
      </ul>
    </nav>
  );
}
