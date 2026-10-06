import { ArrowRight, Check, CircleAlert, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClearPaidCart } from "@/components/payment-receipt";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/domain";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
  shopIdentity,
  type TestReceipt,
  verifiedReceipt,
} from "@/lib/stripe-checkout";
export const metadata: Metadata = {
  title: "Test order status",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let receipt: TestReceipt | null = null;
  let pending = false;
  if (
    stripeConfigured() &&
    sessionId &&
    /^cs_test_[A-Za-z0-9]{10,200}$/.test(sessionId)
  ) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      receipt = verifiedReceipt(session);
      pending =
        !receipt &&
        !session.livemode &&
        session.metadata?.shop === shopIdentity &&
        session.status !== "expired" &&
        session.payment_status !== "paid";
    } catch {
      /* An invalid or unreachable session never establishes payment. */
    }
  }
  return (
    <main id="main" className="page-wrap">
      <section className="receipt-page">
        <div className={`receipt-symbol ${receipt ? "confirmed" : ""}`}>
          {receipt ? (
            <Check size={36} />
          ) : pending ? (
            <Clock3 size={36} />
          ) : (
            <CircleAlert size={36} />
          )}
        </div>
        <p className="eyebrow">
          {receipt ? "A good step forward" : "Your test checkout"}
        </p>
        <h1>
          {receipt
            ? "All set. Good work awaits."
            : pending
              ? "Your payment is pending."
              : "We could not verify this payment."}
        </h1>
        <p>
          {receipt
            ? "Your Stripe test payment is confirmed. This fictional order will not be shipped, and no real money was charged."
            : pending
              ? "Stripe has not confirmed payment yet. Your cart stays saved until confirmation."
              : "A valid, completed Stripe test session is needed to show an order confirmation. Your cart has been kept."}
        </p>
        {receipt && (
          <>
            <ClearPaidCart
              signature={receipt.signature}
              sessionId={receipt.sessionId}
            />
            <div className="receipt-details">
              <p className="eyebrow">
                Test order · {receipt.sessionId.slice(-12)}
              </p>
              {receipt.lines.map((line) => (
                <div key={line.name}>
                  <span>
                    {line.name} × {line.quantity}
                  </span>
                  <strong>{formatPrice(line.totalCents)}</strong>
                </div>
              ))}
              <div>
                <span>{receipt.shippingLabel}</span>
                <strong>
                  {receipt.shippingCents
                    ? formatPrice(receipt.shippingCents)
                    : "Free"}
                </strong>
              </div>
              <div className="grand-total">
                <span>Total · EUR</span>
                <strong>{formatPrice(receipt.totalCents)}</strong>
              </div>
            </div>
          </>
        )}
        {pending && (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={`/checkout/success?session_id=${encodeURIComponent(sessionId ?? "")}`}
              />
            }
          >
            Check payment status
          </Button>
        )}
        <div className="receipt-actions">
          <Button
            nativeButton={false}
            render={<Link href={receipt ? "/shop" : "/checkout"} />}
          >
            {receipt ? "Keep exploring" : "Return to checkout"}
            <ArrowRight />
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/help#payments" />}
          >
            Payment information
          </Button>
        </div>
      </section>
    </main>
  );
}
