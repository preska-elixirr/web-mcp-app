import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main" className="page-wrap section-space">
      <div className="empty-state">
        <p className="eyebrow">404 / A little off track</p>
        <h1>This page has moved out of reach.</h1>
        <p>Let’s get you back to the essentials.</p>
        <Button nativeButton={false} render={<Link href="/shop" />}>
          Explore the shop
        </Button>
      </div>
    </main>
  );
}
