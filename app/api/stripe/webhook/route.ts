import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { shopIdentity, verifiedReceipt } from "@/lib/stripe-checkout";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret)
    return NextResponse.json(
      { error: "Test webhook is not configured." },
      { status: 503 },
    );
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await request.text();
  if (body.length > 1000000)
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }
  if (event.livemode)
    return NextResponse.json(
      { error: "Only test events are accepted." },
      { status: 400 },
    );
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (
      session.metadata?.shop === shopIdentity &&
      session.payment_status === "paid" &&
      !verifiedReceipt(session)
    )
      // Acknowledge with 200: a 4xx makes Stripe retry the same event for
      // days. Log only the session ID, never customer data.
      console.error(
        `[stripe-webhook] test session ${session.id} could not be verified`,
      );
    // The demo keeps its test orders in Stripe. No fulfillment side effects here.
  }
  return NextResponse.json({ received: true });
}
