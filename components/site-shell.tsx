"use client";
import { ArrowUpRight, Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getCart } from "@/lib/domain";
import { useRouteScrollRestoration } from "./route-scroll-restoration";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
export function SiteHeader() {
  const { state } = useShop();
  const count = getCart(state.cart).itemCount;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="announcement">
        A little order. A lot more focus.{" "}
        <span>Free standard delivery on orders €100+</span>
      </div>
      <header className="site-header">
        <Link href="/" className="wordmark" onClick={() => setMenuOpen(false)}>
          office supply<span>.</span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          <Link
            href="/shop"
            aria-current={pathname === "/shop" ? "page" : undefined}
          >
            Shop all
          </Link>
          <Link href="/shop?category=keyboards">For your desk</Link>
          <Link
            href="/about"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            Our approach
          </Link>
          <Link
            href="/help"
            aria-current={pathname === "/help" ? "page" : undefined}
          >
            Help
          </Link>
        </nav>
        <div className="header-actions">
          <span className="demo-pill">Test shop</span>
          <Link
            className="cart-link"
            href="/cart"
            aria-label={`Cart, ${count} items`}
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingBag size={20} aria-hidden="true" />
            <span>Cart</span>
            <span className="cart-count">{count}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="mobile-nav"
        >
          {[
            ["/shop", "Shop all"],
            ["/about", "Our approach"],
            ["/help", "Help"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Link className="wordmark" href="/">
            office supply<span>.</span>
          </Link>
          <p>
            Good tools. Clear head.
            <br />
            Everyday essentials for a better workspace.
          </p>
        </div>
        <nav aria-label="Shop categories">
          <h2>Find your focus</h2>
          <Link href="/shop?category=keyboards">Keyboards</Link>
          <Link href="/shop?category=mice">Mice</Link>
          <Link href="/shop?category=monitors">Monitors</Link>
          <Link href="/shop?category=accessories">Desk accessories</Link>
        </nav>
        <nav aria-label="Customer information">
          <h2>A little help</h2>
          <Link href="/help#delivery">Delivery & returns</Link>
          <Link href="/help#payments">Payment information</Link>
          <Link href="/about">Our approach</Link>
          <Link href="/demo">WebMCP demo</Link>
        </nav>
        <div>
          <h2>Made for trying things out.</h2>
          <p>
            This is a fictional shop. Stripe payments run in test mode. No real
            payment or delivery takes place.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Office Supply demo</span>
        <span>EUR · Generated product photography</span>
        <Link href="/demo">
          Explore WebMCP <ArrowUpRight size={14} />
        </Link>
      </div>
    </footer>
  );
}
// Pages own their view transitions (see PageTransition). This only hosts the
// history scroll restoration hook.
export function RouteTransition({ children }: { children: React.ReactNode }) {
  useRouteScrollRestoration();
  return children;
}
