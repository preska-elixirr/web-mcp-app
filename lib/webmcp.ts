import { z } from "zod";
import {
  type CheckoutRequest,
  cartSignature,
  checkoutFormSchema,
  checkoutTotals,
  shippingMethods,
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
  title: string;
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
  cancelled?: boolean;
};
export type ToolDefinition = Omit<WebTool, "execute">;
export type PendingToolCall = Pick<
  ToolActivity,
  "id" | "name" | "input" | "timestamp"
>;
const emptySchema = z.strictObject({});
const detailsSchema = z.strictObject({
  productId: addToCartSchema.shape.productId,
});
const checkoutSummarySchema = checkoutFormSchema.pick({ shippingMethod: true });
type Bridge = {
  getState: () => ShopState;
  dispatch: (action: ShopAction) => ShopState;
  openCheckout: () => void;
  record: (entry: ToolActivity) => void;
  started?: (entry: PendingToolCall) => void;
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
    signal?.throwIfAborted();
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
  // An identical retry in this document reuses the server's Stripe
  // idempotency key, including after a lost response or cancelled fetch.
  // Contact details stay in memory, never in the activity/storage transcript.
  let checkoutAttempt: { payload: string; id: string } | null = null;
  function tool(
    name: string,
    description: string,
    schema: z.ZodType,
    hints: Partial<WebTool["annotations"]>,
    operation: (input: unknown, signal?: AbortSignal) => unknown,
  ): WebTool {
    return {
      name,
      title: name
        .replaceAll("_", " ")
        .replace(/^./, (letter) => letter.toUpperCase()),
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
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        bridge.started?.({ id, name, input, timestamp });
        let success = true;
        let cancelled = false;
        let output: string;
        try {
          options?.signal?.throwIfAborted();
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
              {
                issues: parsed.error.issues.map((issue) => ({
                  path: issue.path.join("."),
                  code: issue.code,
                })),
                recovery:
                  "Use the tool's input schema to correct these fields and try again.",
              },
            );
          const result = await operation(parsed.data, options?.signal);
          options?.signal?.throwIfAborted();
          output = JSON.stringify({ ok: true, result });
        } catch (error) {
          success = false;
          cancelled = options?.signal?.aborted === true;
          output = JSON.stringify({
            ok: false,
            error: {
              code: cancelled
                ? "CANCELLED"
                : error instanceof DomainError
                  ? error.code
                  : "INTERNAL_ERROR",
              message: cancelled
                ? "The tool call was cancelled. Read the cart before retrying a mutation; retrying identical checkout details reuses its attempt ID in this document."
                : error instanceof DomainError
                  ? error.message
                  : "The tool could not complete.",
              ...(error instanceof DomainError && error.details
                ? { details: error.details }
                : {}),
            },
          });
        }
        bridge.record({
          id,
          name,
          input,
          output,
          success,
          timestamp,
          durationMs: Math.round(performance.now() - started),
          ...(cancelled ? { cancelled: true } : {}),
        });
        options?.signal?.throwIfAborted();
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
      "clear_cart",
      "Remove every product from the current cart and return the empty cart in EUR cents. Repeating the call keeps the cart empty. Previously created Stripe test sessions are separate and are not cancelled.",
      emptySchema,
      { readOnlyHint: false },
      () => {
        checkoutAttempt = null;
        return getCart(bridge.dispatch({ type: "clear-cart" }).cart);
      },
    ),
    tool(
      "get_checkout_summary",
      "Preview the non-empty cart with the selected delivery method. Returns product lines, subtotal, delivery fee, final total in EUR cents, shipping estimate and cart signature. Read only; suitable for reviewing the full cost before start_checkout.",
      checkoutSummarySchema,
      { readOnlyHint: true },
      (input) => {
        const { shippingMethod } = checkoutSummarySchema.parse(input);
        const cart = bridge.getState().cart;
        return {
          ...checkoutTotals(cart, shippingMethod),
          shippingMethod,
          shippingEstimate: shippingMethods[shippingMethod].estimate,
          signature: cartSignature(cart),
        };
      },
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
      "Create a Stripe test payment session for the non-empty cart using authorized contact details, delivery method and acknowledgeDemo: true. Returns a hosted payment URL and total/delivery fee in EUR cents. Identical requests reuse an attempt ID for retries in this document. Open the returned URL for human payment; this tool does not pay or navigate.",
      checkoutFormSchema,
      { readOnlyHint: false, consequentialHint: true },
      async (input, signal) => {
        const form = checkoutFormSchema.parse(input);
        const cart = bridge.getState().cart;
        const totals = checkoutTotals(cart, form.shippingMethod);
        const payload = JSON.stringify({ ...form, cart: cartSignature(cart) });
        if (checkoutAttempt?.payload !== payload)
          checkoutAttempt = { payload, id: crypto.randomUUID() };
        const requestCart = [...cart].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        );
        const url = await createStripeSession(
          { ...form, cart: requestCart, attemptId: checkoutAttempt.id },
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
  registered?: () => void,
): Promise<void> {
  for (const tool of tools) {
    if (signal.aborted) return;
    await context.registerTool(tool, { signal });
    if (!signal.aborted) registered?.();
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
