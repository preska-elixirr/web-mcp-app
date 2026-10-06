import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout-view";
import { stripeConfigured } from "@/lib/stripe";
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function CheckoutPage() {
  return (
    <main id="main" className="page-wrap">
      <Suspense fallback={<p className="loading-state">Loading checkout…</p>}>
        <CheckoutView stripeReady={stripeConfigured()} />
      </Suspense>
    </main>
  );
}
