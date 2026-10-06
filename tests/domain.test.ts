import { describe, expect, it } from "vitest";
import { catalog, demoScenario } from "../lib/catalog";
import {
  addToCart,
  DomainError,
  getCart,
  getProductDetails,
  prepareCheckout,
  restoreCart,
  searchProducts,
  serializeCart,
  setCartQuantity,
} from "../lib/domain";
import type { Cart } from "../lib/validation";

function expectCode(action: () => unknown, code: DomainError["code"]) {
  try {
    action();
    throw new Error("Expected a domain error.");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe("catalog search", () => {
  it("has unique products with integer prices and stock", () => {
    expect(new Set(catalog.map((product) => product.id)).size).toBe(
      catalog.length,
    );
    expect(
      catalog.every(
        (product) =>
          Number.isSafeInteger(product.priceCents) &&
          Number.isSafeInteger(product.stock),
      ),
    ).toBe(true);
  });

  it("combines text, category, connectivity, price and availability filters", () => {
    const result = searchProducts({
      query: "  wireless  ",
      category: "keyboards",
      connectivity: "wireless",
      maxPriceCents: 3490,
      inStockOnly: true,
    });
    expect(result.map((product) => product.id)).toEqual(["kb-air"]);
    expect(searchProducts({ maxPriceCents: 0 })).toEqual([]);
  });

  it("sorts prices without mutating the seeded order and excludes sold-out stock", () => {
    const original = catalog.map((product) => product.id);
    const sorted = searchProducts({ sort: "price_asc", inStockOnly: true });
    expect(sorted[0].id).toBe("mouse-track");
    expect(sorted.some((product) => product.stock === 0)).toBe(false);
    expect(catalog.map((product) => product.id)).toEqual(original);
  });

  it("rejects unknown filters and missing products with useful error codes", () => {
    expectCode(
      () => searchProducts({ category: "invalid" }),
      "INVALID_ARGUMENTS",
    );
    expectCode(
      () => searchProducts({ maxPriceCents: -1 }),
      "INVALID_ARGUMENTS",
    );
    expectCode(() => getProductDetails("missing"), "PRODUCT_NOT_FOUND");
  });
});

describe("cart operations", () => {
  it("adds cumulatively and sets quantities absolutely, with zero removing a line", () => {
    let cart = addToCart([], { productId: "kb-air", quantity: 1 });
    cart = addToCart(cart, { productId: "kb-air", quantity: 2 });
    expect(cart).toEqual([{ productId: "kb-air", quantity: 3 }]);
    cart = setCartQuantity(cart, { productId: "kb-air", quantity: 1 });
    expect(cart[0].quantity).toBe(1);
    expect(setCartQuantity(cart, { productId: "kb-air", quantity: 0 })).toEqual(
      [],
    );
  });

  it("rejects aggregate stock overflow without mutating the original cart", () => {
    const cart = [{ productId: "kb-air", quantity: 23 }];
    expectCode(
      () => addToCart(cart, { productId: "kb-air", quantity: 2 }),
      "INSUFFICIENT_STOCK",
    );
    expect(cart).toEqual([{ productId: "kb-air", quantity: 23 }]);
    expectCode(
      () => addToCart([], { productId: "mouse-pro", quantity: 1 }),
      "INSUFFICIENT_STOCK",
    );
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    "2",
  ])("rejects invalid additive quantity %s", (quantity) => {
    expectCode(
      () => addToCart([], { productId: "kb-air", quantity }),
      "INVALID_QUANTITY",
    );
  });

  it("rejects missing products, negative absolute quantities, and duplicate saved lines", () => {
    expectCode(
      () => addToCart([], { productId: "missing", quantity: 1 }),
      "PRODUCT_NOT_FOUND",
    );
    expectCode(
      () => setCartQuantity([], { productId: "kb-air", quantity: -1 }),
      "INVALID_QUANTITY",
    );
    expectCode(
      () =>
        getCart([
          { productId: "kb-air", quantity: 1 },
          { productId: "kb-air", quantity: 2 },
        ]),
      "INVALID_CART",
    );
  });

  it("calculates exact cents for the documented cheapest in-stock combination", () => {
    const keyboard = searchProducts({
      category: "keyboards",
      connectivity: "wireless",
      inStockOnly: true,
      sort: "price_asc",
    })[0];
    const mouse = searchProducts({
      category: "mice",
      connectivity: "wireless",
      inStockOnly: true,
      sort: "price_asc",
    })[0];
    let cart: Cart = [];
    cart = addToCart(cart, { productId: keyboard.id, quantity: 2 });
    cart = addToCart(cart, { productId: mouse.id, quantity: 2 });
    const summary = prepareCheckout(cart);
    expect(summary.itemCount).toBe(4);
    expect(summary.totalCents).toBe(demoScenario.expectedTotalCents);
    expect(summary.totalCents).toBeLessThanOrEqual(demoScenario.budgetCents);
    expect(summary.currency).toBe("EUR");
    expect(summary.lines.map((line) => line.lineTotalCents)).toEqual([
      6980, 3980,
    ]);
  });

  it("rejects checkout for an empty cart", () => {
    expectCode(() => prepareCheckout([]), "EMPTY_CART");
  });
});

describe("versioned persistence", () => {
  it("round-trips only valid product IDs and quantities", () => {
    const cart = [{ productId: "mouse-air", quantity: 2 }];
    expect(restoreCart(serializeCart(cart))).toEqual(cart);
    expect(serializeCart(cart)).not.toContain("priceCents");
  });

  it.each([
    null,
    "broken json",
    '{"version":2,"items":[]}',
    '{"version":1,"items":[{"productId":"missing","quantity":1}]}',
    '{"version":1,"items":[{"productId":"mouse-pro","quantity":1}]}',
    '{"version":1,"items":[{"productId":"kb-air","quantity":0}]}',
  ])("discards invalid saved data: %s", (serialized) => {
    expect(restoreCart(serialized)).toEqual([]);
  });

  it("keeps valid lines when one saved line is bad", () => {
    expect(
      restoreCart(
        '{"version":1,"items":[{"productId":"kb-air","quantity":1},{"productId":"missing","quantity":1},"junk"]}',
      ),
    ).toEqual([{ productId: "kb-air", quantity: 1 }]);
  });

  it("clamps saved quantities to stock and merges duplicate lines", () => {
    expect(
      restoreCart(
        '{"version":1,"items":[{"productId":"kb-air","quantity":99}]}',
      ),
    ).toEqual([{ productId: "kb-air", quantity: 24 }]);
    expect(
      restoreCart(
        '{"version":1,"items":[{"productId":"kb-air","quantity":1},{"productId":"kb-air","quantity":1}]}',
      ),
    ).toEqual([{ productId: "kb-air", quantity: 2 }]);
  });
});
