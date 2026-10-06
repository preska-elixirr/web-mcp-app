import { describe, expect, it } from "vitest";
import { initialShopState, shopReducer } from "../lib/store";

describe("checkout lifecycle", () => {
  it("applies queued quantity increments against the latest cart state", () => {
    let state = shopReducer(initialShopState, {
      type: "add",
      productId: "kb-air",
      quantity: 1,
    });
    state = shopReducer(state, {
      type: "adjust",
      productId: "kb-air",
      delta: 1,
    });
    state = shopReducer(state, {
      type: "adjust",
      productId: "kb-air",
      delta: 1,
    });
    expect(state.cart[0].quantity).toBe(3);
  });
  it("invalidates the review after any cart mutation", () => {
    let state = shopReducer(initialShopState, {
      type: "add",
      productId: "kb-air",
      quantity: 1,
    });
    state = shopReducer(state, { type: "review" });
    state = shopReducer(state, {
      type: "set",
      productId: "kb-air",
      quantity: 2,
    });
    expect(state.review).toBeNull();
    expect(state.cart[0].quantity).toBe(2);
  });

  it("keeps the cart while preparing a checkout review", () => {
    let state = shopReducer(initialShopState, {
      type: "add",
      productId: "kb-air",
      quantity: 2,
    });
    state = shopReducer(state, { type: "review" });
    expect(state.review?.summary.totalCents).toBe(6980);
    expect(state.cart[0].quantity).toBe(2);
  });

  it("preserves cart and review on a failed stock update", () => {
    let state = shopReducer(initialShopState, {
      type: "add",
      productId: "kb-air",
      quantity: 1,
    });
    state = shopReducer(state, { type: "review" });
    const failed = shopReducer(state, {
      type: "add",
      productId: "kb-air",
      quantity: 99,
    });
    expect(failed.cart).toEqual(state.cart);
    expect(failed.review).toEqual(state.review);
    expect(failed.revision).toBe(state.revision);
    expect(failed.error).toContain("24");
  });

  it("resets cart and review", () => {
    const state = shopReducer(
      { ...initialShopState, cart: [{ productId: "kb-air", quantity: 1 }] },
      { type: "reset" },
    );
    expect(state.cart).toEqual([]);
    expect(state.review).toBeNull();
    expect(state.hydrated).toBe(true);
  });
});
