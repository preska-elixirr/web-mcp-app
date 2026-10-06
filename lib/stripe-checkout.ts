import { createHash } from "node:crypto";
import type Stripe from "stripe";
import {
  type CheckoutRequest,
  cartFromSignature,
  cartSignature,
  checkoutTotals,
  shippingMethods,
} from "./checkout";
export const shopIdentity = "office-supply-demo-v1";
export function checkoutIdempotencyKey(request: CheckoutRequest): string {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        name: request.name,
        email: request.email,
        shipping: request.shippingMethod,
        cart: cartSignature(request.cart),
      }),
    )
    .digest("hex");
  return `office-supply:${request.attemptId}:${fingerprint}`;
}
export function stripeSessionParams(
  request: CheckoutRequest,
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  const totals = checkoutTotals(request.cart, request.shippingMethod);
  const shipping = shippingMethods[request.shippingMethod];
  return {
    mode: "payment",
    ui_mode: "hosted_page",
    allowed_payment_method_types: ["card"],
    customer_email: request.email,
    client_reference_id: request.attemptId,
    line_items: totals.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: "eur",
        unit_amount: line.product.priceCents,
        product_data: {
          name: line.product.name,
          description: line.product.description,
          metadata: { product_id: line.productId },
        },
      },
    })),
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: ["HR", "SI", "DE", "AT", "IT"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: totals.shippingCents, currency: "eur" },
          display_name: shipping.label,
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: request.shippingMethod === "standard" ? 3 : 1,
            },
            maximum: {
              unit: "business_day",
              value: request.shippingMethod === "standard" ? 5 : 2,
            },
          },
        },
      },
    ],
    metadata: {
      shop: shopIdentity,
      cart: cartSignature(request.cart),
      shipping_method: request.shippingMethod,
      contact_name: request.name,
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    branding_settings: {
      display_name: "Office Supply · Test shop",
      background_color: "#f8f8f3",
      button_color: "#28563f",
    },
    custom_text: {
      submit: {
        message:
          "This is a demo order. No real payment or delivery takes place.",
      },
    },
  };
}
export type TestReceipt = {
  sessionId: string;
  signature: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingLabel: string;
  lines: { name: string; quantity: number; totalCents: number }[];
};
// URL flags cannot establish payment. Only the server-fetched Stripe session can.
export type PaymentSession = Pick<
  Stripe.Checkout.Session,
  | "id"
  | "livemode"
  | "mode"
  | "status"
  | "payment_status"
  | "currency"
  | "amount_subtotal"
  | "amount_total"
  | "metadata"
>;
export function verifiedReceipt(session: PaymentSession): TestReceipt | null {
  if (
    session.livemode ||
    session.mode !== "payment" ||
    session.status !== "complete" ||
    session.payment_status !== "paid" ||
    session.currency !== "eur" ||
    session.metadata?.shop !== shopIdentity
  )
    return null;
  try {
    const cart = cartFromSignature(session.metadata.cart);
    const method = session.metadata.shipping_method;
    if (method !== "standard" && method !== "express") return null;
    const totals = checkoutTotals(cart, method);
    if (
      totals.totalCents !== session.amount_total ||
      session.amount_subtotal !== totals.subtotalCents
    )
      return null;
    return {
      sessionId: session.id,
      signature: cartSignature(cart),
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      shippingLabel: shippingMethods[method].label,
      lines: totals.lines.map((line) => ({
        name: line.product.name,
        quantity: line.quantity,
        totalCents: line.lineTotalCents,
      })),
    };
  } catch {
    return null;
  }
}
