import { NextResponse } from "next/server";
import { checkoutRequestSchema, checkoutTotals } from "@/lib/checkout";
import { DomainError } from "@/lib/domain";
import {
  allowedCheckoutOrigin,
  appOrigin,
  getStripe,
  stripeConfigured,
} from "@/lib/stripe";
import {
  checkoutIdempotencyKey,
  stripeSessionParams,
} from "@/lib/stripe-checkout";
export const runtime = "nodejs";
function failure(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    if (!allowedCheckoutOrigin(request.headers.get("origin")))
      return failure("Checkout must start from this shop.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return failure("Send a JSON checkout request.", 415);
    const body = await request.text();
    if (body.length > 16000)
      return failure("The checkout request is too large.", 413);
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      return failure("The checkout request is not valid JSON.", 400);
    }
    const parsed = checkoutRequestSchema.safeParse(data);
    if (!parsed.success)
      return failure(
        "Check your contact details, delivery choice and cart.",
        400,
      );
    checkoutTotals(parsed.data.cart, parsed.data.shippingMethod);
    if (!stripeConfigured())
      return failure(
        "Stripe test checkout is not connected yet. Add STRIPE_SECRET_KEY to the server environment.",
        503,
      );
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      stripeSessionParams(
        parsed.data,
        appOrigin(request.headers.get("origin") ?? undefined),
      ),
      { idempotencyKey: checkoutIdempotencyKey(parsed.data) },
    );
    if (
      session.livemode ||
      !session.url ||
      new URL(session.url).hostname !== "checkout.stripe.com"
    )
      return failure("A test payment session could not be created.", 502);
    return NextResponse.json(
      { url: session.url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DomainError) return failure(error.message, 400);
    // Never include Stripe internals, credentials or customer data in logs/responses.
    return failure(
      "We could not start Stripe checkout. Your cart is still saved. Please try again.",
      502,
    );
  }
}
