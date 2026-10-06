import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "Our approach" };
export default function AboutPage() {
  return (
    <main id="main" className="page-wrap">
      <div className="page-intro">
        <p className="eyebrow">Less, but considered</p>
        <h1>Good tools. Clear head.</h1>
        <p>A calmer workspace is built one thoughtful choice at a time.</p>
      </div>
      <Image
        src="/images/workspace-hero.png"
        alt="An organised workspace in soft daylight"
        width={1672}
        height={941}
        sizes="90vw"
        className="w-full rounded-sm"
      />
      <div className="prose-page pt-8">
        <h2>Small things shape the workday.</h2>
        <p>
          A quiet keyboard. A comfortable mouse. A screen with room to think.
          Office Supply brings these everyday essentials together in a simple,
          considered catalog.
        </p>
        <p>
          Our approach is clear choices and useful details: transparent prices,
          visible stock and an easy path from product to cart to checkout.
        </p>
        <h2>A shop built for exploration.</h2>
        <p>
          Office Supply is a fictional shop and WebMCP demonstration. You can
          explore products, build a cart and try Stripe test checkout. There is
          no real payment or delivery.
        </p>
        <p>
          The catalog, photography and delivery rules are demo content. This
          project explores how people and browser agents can use the same
          validated shopping operations while the person remains in control of
          payment.
        </p>
        <Button nativeButton={false} render={<Link href="/shop" />}>
          Find your essentials <ArrowRight />
        </Button>
      </div>
    </main>
  );
}
