"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useMobileMenu } from "@/hooks/useMobileMenu";

const NAV_LINKS = [
  { href: "/aggregators", label: "Aggregators" },
  { href: "/invest", label: "Baskets" },
  { href: "#chains", label: "Chains" },
];

export function LandingNav() {
  const menu = useMobileMenu();
  const activeClass = menu.isOpen ? " active" : "";
  return (
    <nav className="landing-nav" aria-label="Main">
      <Link href="/" className="nav-logo">
        <Sparkles aria-hidden size={18} />
        enchantress
      </Link>
      <button
        type="button"
        className={`menu-toggle${activeClass}`}
        aria-expanded={menu.isOpen}
        aria-controls="landing-menu"
        aria-label="Toggle menu"
        onClick={menu.toggle}
      >
        <span />
        <span />
      </button>
      <div id="landing-menu" className={`nav-menu${activeClass}`}>
        <ul className="nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={menu.close}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <Link href="/create" className="btn-login" onClick={menu.close}>
            Create basket
          </Link>
          <Link href="/aggregators" className="btn-signup" onClick={menu.close}>
            Launch app
          </Link>
        </div>
      </div>
    </nav>
  );
}
