import { describe, expect, it } from "vitest";
import { catalog } from "../lib/catalog";
import {
  cartSignature,
  checkoutRequestSchema,
  checkoutTotals,
  shippingCost,
} from "../lib/checkout";
import { initialShopState, shopReducer } from "../lib/store";
import {
  checkoutIdempotencyKey,
  type PaymentSession,
  shopIdentity,
  stripeSessionParams,
  verifiedReceipt,
} from "../lib/stripe-checkout";

const request = checkoutRequestSchema.parse({
  name: "Demo Person",
  email: "demo@example.com",
  shippingMethod: "standard",
  acknowledgeDemo: true,
  attemptId: "128a0067-9d06-44ac-a1d3-2dd624dff1be",
  cart: [
    { productId: "kb-air", quantity: 2 },
    { productId: "mouse-air", quantity: 2 },
  ],
});
const session = {
  id: "cs_test_example",
  livemode: false,
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  currency: "eur",
  amount_subtotal: 10960,
  amount_total: 10960,
  metadata: {
    shop: shopIdentity,
    cart: cartSignature(request.cart),
    shipping_method: "standard",
  },
} satisfies PaymentSession;
describe("server checkout", () => {
  it("keeps the complete catalog cart within Stripe's metadata limit", () => {
    const cart = catalog
      .filter((product) => product.stock > 0)
      .map((product) => ({ productId: product.id, quantity: product.stock }));
    const params = stripeSessionParams(
      { ...request, cart },
      "https://shop.example",
    );
    expect(String(params.metadata?.cart).length).toBeLessThanOrEqual(500);
  });
  it("recomputes integer prices and shipping from catalog", () => {
    expect(checkoutTotals(request.cart, "standard").totalCents).toBe(10960);
    expect(checkoutTotals(request.cart, "express").totalCents).toBe(11950);
    expect(shippingCost(9999, "standard")).toBe(490);
    expect(shippingCost(10000, "standard")).toBe(0);
  });
  it("rejects client amounts, duplicate lines, unavailable stock and malformed contact", () => {
    expect(
      checkoutRequestSchema.safeParse({ ...request, totalCents: 1 }).success,
    ).toBe(false);
    expect(
      checkoutRequestSchema.safeParse({
        ...request,
        email: "invalid",
        acknowledgeDemo: false,
      }).success,
    ).toBe(false);
    expect(() =>
      checkoutTotals([{ productId: "kb-air", quantity: 25 }], "standard"),
    ).toThrow("24");
    expect(() =>
      checkoutTotals([...request.cart, request.cart[0]], "standard"),
    ).toThrow("duplicate");
    expect(() =>
      checkoutTotals([{ productId: "mouse-pro", quantity: 1 }], "standard"),
    ).toThrow("0");
  });
  it("creates a hosted EUR card session and trusted return URLs", () => {
    const params = stripeSessionParams(request, "https://shop.example");
    expect(params.mode).toBe("payment");
    expect(params.ui_mode).toBe("hosted_page");
    expect(params.allowed_payment_method_types).toEqual(["card"]);
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(3490);
    expect(
      params.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount,
    ).toBe(0);
    expect(params.success_url).toBe(
      "https://shop.example/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toContain("/checkout?cancelled=1");
  });
  it("deduplicates identical retries but changes keys with the order", () => {
    expect(checkoutIdempotencyKey(request)).toBe(
      checkoutIdempotencyKey({ ...request, cart: [...request.cart].reverse() }),
    );
    expect(checkoutIdempotencyKey(request)).not.toBe(
      checkoutIdempotencyKey({ ...request, shippingMethod: "express" }),
    );
    expect(checkoutIdempotencyKey(request)).not.toBe(
      checkoutIdempotencyKey({ ...request, email: "other@example.com" }),
    );
  });
});
describe("payment confirmation", () => {
  it("accepts only a complete paid matching test session", () => {
    expect(verifiedReceipt(session)?.totalCents).toBe(10960);
    for (const change of [
      { livemode: true },
      { status: "open" },
      { payment_status: "unpaid" },
      { currency: "usd" },
      { amount_total: 1 },
      { amount_subtotal: 1 },
      { metadata: { ...session.metadata, shop: "other" } },
      { metadata: { ...session.metadata, cart: "broken" } },
    ])
      expect(
        verifiedReceipt({ ...session, ...change } as PaymentSession),
      ).toBeNull();
  });
  it("does not clear a cart edited while Stripe was open", () => {
    const state = {
      ...initialShopState,
      hydrated: true,
      cart: [{ productId: "kb-air", quantity: 3 }],
    };
    expect(
      shopReducer(state, {
        type: "paid",
        signature: cartSignature(request.cart),
      }).cart,
    ).toEqual(state.cart);
    expect(
      shopReducer(
        { ...state, cart: request.cart },
        { type: "paid", signature: cartSignature([...request.cart].reverse()) },
      ).cart,
    ).toEqual([]);
  });
});
