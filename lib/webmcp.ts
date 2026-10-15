import { z } from "zod";
import {
  type CheckoutRequest,
  cartSignature,
  checkoutFormSchema,
  checkoutTotals,
} from "./checkout";
import {
  addToCart,
  DomainError,
  getCart,
  getProductDetails,
  prepareCheckout,
  searchProducts,
  setCartQuantity,
} from "./domain";
import { productHref } from "./products";
import type { ShopAction, ShopState } from "./store";
import {
  addToCartSchema,
  searchSchema,
  setCartQuantitySchema,
} from "./validation";
export type WebTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    consequentialHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (
    input: unknown,
    options?: { signal?: AbortSignal },
  ) => Promise<string>;
};
export type ModelContext = {
  registerTool: (
    tool: WebTool,
    options: { signal: AbortSignal },
  ) => Promise<void> | void;
  getTools?: () => Promise<{ name: string }[]>;
  executeTool?: (tool: { name: string }, input: unknown) => Promise<unknown>;
};
export type ToolActivity = {
  id: string;
  name: string;
  input: unknown;
  output: string;
  success: boolean;
  timestamp: string;
  durationMs: number;
};
const emptySchema = z.strictObject({});
const detailsSchema = z.strictObject({ productId: z.string().min(1).max(100) });
type Bridge = {
  getState: () => ShopState;
  dispatch: (action: ShopAction) => ShopState;
  openCheckout: () => void;
  record: (entry: ToolActivity) => void;
};
// Same request and URL check as the checkout form submit in
// components/checkout-view.tsx. Only a Stripe test checkout URL is returned.
async function createStripeSession(
  request: CheckoutRequest,
  signal?: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    throw new DomainError(
      "CHECKOUT_FAILED",
      "We could not connect to checkout. Your cart is still saved. Please try again.",
    );
  }
  const result: { url?: string; error?: string } = await response
    .json()
    .catch(() => ({}));
  if (!response.ok || !result.url)
    throw new DomainError(
      "CHECKOUT_FAILED",
      result.error ?? "We could not start checkout. Please try again.",
    );
  const url = URL.canParse(result.url) ? new URL(result.url) : null;
  if (url?.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    throw new DomainError("CHECKOUT_FAILED", "Unexpected payment URL.");
  return url.href;
}
export function createShopTools(bridge: Bridge): WebTool[] {
  function tool(
    name: string,
    description: string,
    schema: z.ZodType,
    hints: Partial<WebTool["annotations"]>,
    operation: (input: unknown, signal?: AbortSignal) => unknown,
  ): WebTool {
    return {
      name,
      description,
      inputSchema: z.toJSONSchema(schema),
      annotations: {
        readOnlyHint: false,
        consequentialHint: false,
        untrustedContentHint: false,
        ...hints,
      },
      execute: async (input, options) => {
        const started = performance.now();
        let success = true;
        let output: string;
        try {
          if (options?.signal?.aborted)
            throw new DomainError(
              "INVALID_ARGUMENTS",
              "The tool call was cancelled.",
            );
          if (!bridge.getState().hydrated)
            throw new DomainError(
              "INVALID_CART",
              "The cart is still loading. Retry shortly.",
            );
          const parsed = schema.safeParse(input ?? {});
          if (!parsed.success)
            throw new DomainError(
              "INVALID_ARGUMENTS",
              "Arguments do not match this tool's input schema.",
            );
          output = JSON.stringify({
            ok: true,
            result: await operation(parsed.data, options?.signal),
          });
        } catch (error) {
          success = false;
          output = JSON.stringify({
            ok: false,
            error: {
              code:
                error instanceof DomainError ? error.code : "INTERNAL_ERROR",
              message:
                error instanceof DomainError
                  ? error.message
                  : "The tool could not complete.",
            },
          });
        }
        bridge.record({
          id: crypto.randomUUID(),
          name,
          input,
          output,
          success,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started),
        });
        return output;
      },
    };
  }
  return [
    tool(
      "search_products",
      "Search fictional office products. Prices and maxPriceCents are EUR cents per unit. Filters are combined. Returns IDs, stock and product page links. Read only.",
      searchSchema,
      { readOnlyHint: true },
      (input) =>
        searchProducts(input).map((product) => ({
          ...product,
          url: productHref(product),
        })),
    ),
    tool(
      "get_product_details",
      "Get specifications, unit price in EUR cents and stock for a product ID. Read only.",
      detailsSchema,
      { readOnlyHint: true },
      (input) => {
        const product = getProductDetails(detailsSchema.parse(input).productId);
        return { ...product, url: productHref(product) };
      },
    ),
    tool(
      "add_to_cart",
      "Add a positive integer quantity to the current cart, subject to stock. Quantity is additive. Updates the same visible cart used by the customer. Returns the full cart in EUR cents.",
      addToCartSchema,
      { readOnlyHint: false },
      (input) => {
        const args = addToCartSchema.parse(input);
        addToCart(bridge.getState().cart, args);
        return getCart(bridge.dispatch({ type: "add", ...args }).cart);
      },
    ),
    tool(
      "set_cart_quantity",
      "Set an absolute non-negative integer quantity for a product. Zero removes it. Validates stock. Returns the updated cart in EUR cents.",
      setCartQuantitySchema,
      { readOnlyHint: false },
      (input) => {
        const args = setCartQuantitySchema.parse(input);
        setCartQuantity(bridge.getState().cart, args);
        return getCart(bridge.dispatch({ type: "set", ...args }).cart);
      },
    ),
    tool(
      "get_cart",
      "Read current cart lines, quantities, product subtotal in EUR cents and currency. Delivery is selected at checkout. Read only.",
      emptySchema,
      { readOnlyHint: true },
      () => getCart(bridge.getState().cart),
    ),
    tool(
      "prepare_checkout",
      "Validate the non-empty cart and open checkout for human review. Returns product subtotal in EUR cents, signature and checkout URL. Does not create a Stripe session, confirm an order or make payment.",
      emptySchema,
      { readOnlyHint: false },
      () => {
        const summary = prepareCheckout(bridge.getState().cart);
        bridge.dispatch({ type: "review" });
        bridge.openCheckout();
        return {
          ...summary,
          signature: cartSignature(bridge.getState().cart),
          url: "/checkout",
          requiresHumanPayment: true,
        };
      },
    ),
    tool(
      "start_checkout",
      "Start Stripe test checkout for the non-empty cart without the checkout form. Needs the customer's name, email, delivery method (standard or express) and acknowledgeDemo: true. Creates a Stripe test payment session and returns its URL plus the order total and delivery fee in EUR cents. Does not open the URL and does not make payment: a human must open the URL and pay on Stripe's hosted test page.",
      checkoutFormSchema,
      { readOnlyHint: false, consequentialHint: true },
      async (input, signal) => {
        const form = checkoutFormSchema.parse(input);
        const cart = bridge.getState().cart;
        const totals = checkoutTotals(cart, form.shippingMethod);
        const url = await createStripeSession(
          { ...form, cart, attemptId: crypto.randomUUID() },
          signal,
        );
        return {
          url,
          totalCents: totals.totalCents,
          shippingCents: totals.shippingCents,
          requiresHumanPayment: true,
        };
      },
    ),
  ];
}
export async function registerShopTools(
  context: ModelContext,
  tools: WebTool[],
  signal: AbortSignal,
): Promise<void> {
  for (const tool of tools) {
    if (signal.aborted) return;
    await context.registerTool(tool, { signal });
  }
}
const legacyContexts = new WeakSet<ModelContext>();
export async function executeNativeTool(
  context: ModelContext,
  tool: { name: string },
  input: unknown,
): Promise<unknown> {
  if (!context.executeTool)
    throw new Error("Native tool execution is unavailable.");
  if (legacyContexts.has(context))
    return context.executeTool(tool, JSON.stringify(input));
  try {
    return await context.executeTool(tool, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Chrome before 155 requires JSON text. Retry only argument parsing
    // failure before a handler runs, never a tool execution error.
    if (!message.includes("Failed to parse input arguments")) throw error;
    legacyContexts.add(context);
    return context.executeTool(tool, JSON.stringify(input));
  }
}
