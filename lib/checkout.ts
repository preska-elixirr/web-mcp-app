import { z } from "zod";
import { prepareCheckout } from "./domain";
import { type Cart, cartSchema } from "./validation";

export const shippingMethods = {
  standard: {
    label: "Standard delivery",
    estimate: "3–5 business days",
    feeCents: 490,
  },
  express: {
    label: "Express delivery",
    estimate: "1–2 business days",
    feeCents: 990,
  },
} as const;
// Stripe collects the shipping and billing address on its hosted payment page.
export const checkoutFormSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120)
    .describe(
      "Customer contact name. Fictional names are suitable for this test shop.",
    ),
  email: z
    .email("Enter a valid email address.")
    .max(254)
    .describe(
      "Customer-authorized email address passed to Stripe test checkout.",
    ),
  shippingMethod: z
    .enum(["standard", "express"])
    .describe("Standard: €4.90, free from €100 subtotal. Express: €9.90."),
  acknowledgeDemo: z
    .literal(true, {
      error: "Confirm that this is a test order.",
    })
    .describe(
      "Explicit acknowledgement that this is a fictional test order with no real charge or delivery.",
    ),
});
export const checkoutRequestSchema = checkoutFormSchema.extend({
  cart: cartSchema.min(1),
  attemptId: z.uuid(),
});
export type CheckoutForm = z.infer<typeof checkoutFormSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type ShippingMethod = keyof typeof shippingMethods;
export function shippingCost(
  subtotalCents: number,
  method: ShippingMethod,
): number {
  return method === "standard" && subtotalCents >= 10000
    ? 0
    : shippingMethods[method].feeCents;
}
// Stable across reordered lines; never contains customer information.
export function cartSignature(cart: Cart): string {
  return [...cart]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((item) => `${item.productId}:${item.quantity}`)
    .join("|");
}
export function cartFromSignature(signature: string): Cart {
  const items = signature.split("|").map((line) => {
    const match = /^([a-z0-9-]+):([1-9][0-9]*)$/.exec(line);
    if (!match) throw new Error("Invalid cart signature");
    return { productId: match[1], quantity: Number(match[2]) };
  });
  return cartSchema.min(1).parse(items);
}
export function checkoutTotals(cart: Cart, method: ShippingMethod) {
  const summary = prepareCheckout(cart);
  const shippingCents = shippingCost(summary.totalCents, method);
  return {
    ...summary,
    subtotalCents: summary.totalCents,
    shippingCents,
    totalCents: summary.totalCents + shippingCents,
  };
}
