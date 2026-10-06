import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "A little help" };
export default function HelpPage() {
  return (
    <main id="main" className="page-wrap">
      <div className="page-intro">
        <p className="eyebrow">Here to keep things clear</p>
        <h1>A little help.</h1>
        <p>Everything you need to know before trying the shop.</p>
      </div>
      <div className="prose-page">
        <section id="delivery">
          <h2>Delivery & returns</h2>
          <p>
            For this demo, standard delivery costs €4.90 and is free when your
            product subtotal reaches €100. Express delivery costs €9.90. The
            checkout shows the exact amount before payment.
          </p>
          <p>
            Shipping address collection supports Croatia, Slovenia, Germany,
            Austria and Italy. Delivery estimates are fictional: no products are
            shipped. There is no real purchase or returns process.
          </p>
        </section>
        <section id="payments">
          <h2>Stripe test payments</h2>
          <p>
            Checkout uses Stripe’s hosted payment page in test mode. Enter your
            delivery address and test card there. Card details never pass
            through this app.
          </p>
          <p>
            Use card <strong>4242 4242 4242 4242</strong>, any future expiry
            date and any three-digit CVC. Use fictional contact and address
            details.
          </p>
          <p>
            If Stripe is not connected, the shop owner must add a test secret
            key in the server environment. The shop rejects live keys. See{" "}
            <a
              href="https://docs.stripe.com/testing"
              target="_blank"
              rel="noreferrer"
            >
              Stripe’s official testing guide
            </a>
            .
          </p>
          <p>
            A cancelled or failed payment preserves your cart. The confirmation
            page checks the payment status with Stripe before displaying
            success. Orders remain visible in the owner’s Stripe test dashboard.
          </p>
        </section>
        <section>
          <h2>Your cart & privacy</h2>
          <p>
            The browser remembers completed test checkouts so revisiting a
            receipt does not clear a newly rebuilt cart. These records do not
            contain your contact details or address.
          </p>
          <p>
            Your cart is saved in this browser’s local storage. It contains
            product IDs and quantities. Contact information is sent to Stripe
            only when you continue to payment; it is not stored in the browser
            cart.
          </p>
          <p>
            The app has no account registration, mailing list or advertising
            trackers. Stripe has its own privacy practices. Please use fictional
            personal details while testing.
          </p>
        </section>
        <section>
          <h2>Product photographs</h2>
          <p>
            All product photographs and the homepage workspace image were
            generated specifically for this fictional catalog. They illustrate
            the demo products and do not represent products you can purchase.
          </p>
        </section>
        <section>
          <h2>Trying WebMCP</h2>
          <p>
            Visit the <Link href="/demo">WebMCP demo guide</Link> for browser
            support, available tools and a repeatable shopping scenario.
          </p>
        </section>
      </div>
    </main>
  );
}
