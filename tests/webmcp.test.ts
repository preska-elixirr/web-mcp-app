import { afterEach, describe, expect, it, vi } from "vitest";
import { initialShopState, shopReducer } from "../lib/store";
import {
  createShopTools,
  executeNativeTool,
  type ModelContext,
  registerShopTools,
} from "../lib/webmcp";

function harness() {
  let state = { ...initialShopState, hydrated: true };
  const openCheckout = vi.fn();
  const record = vi.fn();
  const tools = createShopTools({
    getState: () => state,
    dispatch: (action) => {
      state = shopReducer(state, action);
      return state;
    },
    openCheckout,
    record,
  });
  const call = async (name: string, input: unknown) =>
    JSON.parse(
      await (tools.find((tool) => tool.name === name)?.execute(input) ?? "{}"),
    );
  return { tools, call, getState: () => state, openCheckout, record };
}
describe("WebMCP adapter", () => {
  it("supports current object arguments and older JSON-text browsers without double mutations", async () => {
    const current: ModelContext = {
      registerTool: vi.fn(),
      executeTool: vi.fn(async (_tool, input) => input),
    };
    expect(
      await executeNativeTool(current, { name: "get_cart" }, { quantity: 2 }),
    ).toEqual({ quantity: 2 });
    let mutations = 0;
    const legacy: ModelContext = {
      registerTool: vi.fn(),
      executeTool: vi.fn(async (_tool, input) => {
        if (typeof input !== "string")
          throw new Error("Failed to parse input arguments");
        mutations += 1;
        return JSON.parse(input);
      }),
    };
    await executeNativeTool(legacy, { name: "add_to_cart" }, { quantity: 2 });
    await executeNativeTool(legacy, { name: "add_to_cart" }, { quantity: 3 });
    expect(mutations).toBe(2);
    expect(legacy.executeTool).toHaveBeenCalledTimes(3);
    const failed: ModelContext = {
      registerTool: vi.fn(),
      executeTool: vi.fn(async () => {
        throw new Error("Execution failed");
      }),
    };
    await expect(
      executeNativeTool(failed, { name: "add_to_cart" }, {}),
    ).rejects.toThrow("Execution failed");
    expect(failed.executeTool).toHaveBeenCalledOnce();
  });
  it("exposes seven strict tools with correct safety hints", () => {
    const { tools } = harness();
    expect(tools).toHaveLength(7);
    expect(tools.map((tool) => tool.name)).not.toContain("confirm_payment");
    expect(
      tools.every((tool) => tool.inputSchema.additionalProperties === false),
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === "get_cart")?.annotations.readOnlyHint,
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === "start_checkout")?.annotations,
    ).toEqual({
      readOnlyHint: false,
      consequentialHint: true,
      untrustedContentHint: false,
    });
  });
  it("uses latest shared state for sequential calls and human review", async () => {
    const shop = harness();
    await shop.call("add_to_cart", { productId: "kb-air", quantity: 1 });
    await shop.call("add_to_cart", { productId: "kb-air", quantity: 1 });
    await shop.call("add_to_cart", { productId: "mouse-air", quantity: 2 });
    expect((await shop.call("get_cart", {})).result.totalCents).toBe(10960);
    expect(
      (await shop.call("prepare_checkout", {})).result.requiresHumanPayment,
    ).toBe(true);
    expect(shop.openCheckout).toHaveBeenCalledOnce();
    expect(shop.getState().cart).toHaveLength(2);
    await shop.call("set_cart_quantity", { productId: "kb-air", quantity: 0 });
    expect(shop.getState().review).toBeNull();
    expect((await shop.call("get_cart", {})).result.totalCents).toBe(3980);
  });
  it("returns explicit errors without corrupting the current cart", async () => {
    const shop = harness();
    expect((await shop.call("prepare_checkout", {})).error.code).toBe(
      "EMPTY_CART",
    );
    expect(
      (await shop.call("add_to_cart", { productId: "kb-air", quantity: 25 }))
        .error.code,
    ).toBe("INSUFFICIENT_STOCK");
    expect(
      (await shop.call("get_product_details", { productId: "unknown" })).error
        .code,
    ).toBe("PRODUCT_NOT_FOUND");
    expect((await shop.call("get_cart", { extra: true })).error.code).toBe(
      "INVALID_ARGUMENTS",
    );
    expect(shop.getState().cart).toEqual([]);
    expect(shop.record).toHaveBeenCalledTimes(4);
  });
  it("registers abort-scoped tools and stops on cancellation", async () => {
    const registerTool = vi.fn();
    const context: ModelContext = { registerTool };
    const controller = new AbortController();
    const { tools } = harness();
    await registerShopTools(context, tools, controller.signal);
    expect(registerTool).toHaveBeenCalledTimes(7);
    expect(registerTool.mock.calls[0][1].signal).toBe(controller.signal);
    controller.abort();
    registerTool.mockClear();
    await registerShopTools(context, tools, controller.signal);
    expect(registerTool).not.toHaveBeenCalled();
  });
});
describe("start_checkout", () => {
  const form = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    shippingMethod: "express",
    acknowledgeDemo: true,
  };
  const stripeUrl = "https://checkout.stripe.com/c/pay/cs_test_123";
  function mockFetch(body: unknown, status = 200) {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }
  afterEach(() => vi.unstubAllGlobals());
  it("creates a Stripe test session for the cart and returns its URL for human payment", async () => {
    const fetch = mockFetch({ url: stripeUrl });
    const shop = harness();
    await shop.call("add_to_cart", { productId: "kb-air", quantity: 2 });
    await shop.call("add_to_cart", { productId: "mouse-air", quantity: 2 });
    const output = await shop.call("start_checkout", form);
    expect(output).toEqual({
      ok: true,
      result: {
        url: stripeUrl,
        totalCents: 11950,
        shippingCents: 990,
        requiresHumanPayment: true,
      },
    });
    expect(fetch).toHaveBeenCalledOnce();
    const [target, init] = fetch.mock.calls[0];
    expect(target).toBe("/api/checkout");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      ...form,
      cart: shop.getState().cart,
      attemptId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(shop.openCheckout).not.toHaveBeenCalled();
    expect(shop.getState().cart).toHaveLength(2);
  });
  it("rejects an empty cart before contacting the server", async () => {
    const fetch = mockFetch({ url: stripeUrl });
    const shop = harness();
    const output = await shop.call("start_checkout", form);
    expect(output.ok).toBe(false);
    expect(output.error.code).toBe("EMPTY_CART");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects payment URLs that are not Stripe test checkout", async () => {
    const shop = harness();
    await shop.call("add_to_cart", { productId: "kb-air", quantity: 1 });
    for (const url of [
      "https://checkout.stripe.com.evil.example/pay",
      "http://checkout.stripe.com/c/pay/cs_test_123",
      "not a url",
    ]) {
      mockFetch({ url });
      const output = await shop.call("start_checkout", form);
      expect(output.ok).toBe(false);
      expect(output.error.code).toBe("CHECKOUT_FAILED");
    }
  });
  it("passes the server's error message through and requires the demo acknowledgement", async () => {
    const fetch = mockFetch(
      { error: "Stripe test checkout is not connected yet." },
      503,
    );
    const shop = harness();
    await shop.call("add_to_cart", { productId: "kb-air", quantity: 1 });
    expect((await shop.call("start_checkout", form)).error).toEqual({
      code: "CHECKOUT_FAILED",
      message: "Stripe test checkout is not connected yet.",
    });
    expect(
      (await shop.call("start_checkout", { ...form, acknowledgeDemo: false }))
        .error.code,
    ).toBe("INVALID_ARGUMENTS");
    expect(fetch).toHaveBeenCalledOnce();
  });
});
