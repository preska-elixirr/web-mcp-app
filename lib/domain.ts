import { catalog } from "./catalog";
import {
  addToCartSchema,
  type Cart,
  cartSchema,
  type Product,
  savedCartSchema,
  searchSchema,
  setCartQuantitySchema,
} from "./validation";

export type ErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "INVALID_QUANTITY"
  | "INVALID_ARGUMENTS"
  | "INSUFFICIENT_STOCK"
  | "INVALID_CART"
  | "EMPTY_CART"
  | "CHECKOUT_FAILED";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function getProductDetails(productId: string): Product {
  const product = catalog.find((item) => item.id === productId);
  if (!product)
    throw new DomainError(
      "PRODUCT_NOT_FOUND",
      "This product is not in the catalog.",
    );
  return product;
}

export function searchProducts(input: unknown = {}): Product[] {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_ARGUMENTS", "Check the catalog filters.");
  const filters = parsed.data;
  const query = filters.query?.trim().toLowerCase() ?? "";
  const products = catalog.filter(
    (product) =>
      (!query ||
        [product.name, product.description, ...product.specifications]
          .join(" ")
          .toLowerCase()
          .includes(query)) &&
      (!filters.category || product.category === filters.category) &&
      (!filters.connectivity ||
        product.connectivity === filters.connectivity) &&
      (filters.maxPriceCents === undefined ||
        product.priceCents <= filters.maxPriceCents) &&
      (!filters.inStockOnly || product.stock > 0),
  );
  if (filters.sort === "price_asc")
    products.sort(
      (a, b) => a.priceCents - b.priceCents || a.id.localeCompare(b.id),
    );
  if (filters.sort === "price_desc")
    products.sort(
      (a, b) => b.priceCents - a.priceCents || a.id.localeCompare(b.id),
    );
  if (filters.sort === "name")
    products.sort((a, b) => a.name.localeCompare(b.name));
  return products;
}

function validateCart(input: unknown): Cart {
  const parsed = cartSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_CART", "The cart contains invalid items.");
  const ids = new Set<string>();
  for (const item of parsed.data) {
    if (ids.has(item.productId))
      throw new DomainError(
        "INVALID_CART",
        "The cart contains duplicate products.",
      );
    ids.add(item.productId);
    const product = getProductDetails(item.productId);
    if (item.quantity > product.stock)
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `Only ${product.stock} units of ${product.name} are available.`,
      );
  }
  return parsed.data;
}

export function setCartQuantity(cart: Cart, input: unknown): Cart {
  const parsed = setCartQuantitySchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_QUANTITY",
      "Quantity must be a non-negative whole number and include a product ID.",
    );
  const current = validateCart(cart);
  const { productId, quantity } = parsed.data;
  const product = getProductDetails(productId);
  if (quantity > product.stock)
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      `Only ${product.stock} units of ${product.name} are available.`,
    );
  if (quantity === 0)
    return current.filter((item) => item.productId !== productId);
  const exists = current.some((item) => item.productId === productId);
  return exists
    ? current.map((item) =>
        item.productId === productId ? { productId, quantity } : item,
      )
    : [...current, { productId, quantity }];
}

export function addToCart(cart: Cart, input: unknown): Cart {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_QUANTITY",
      "Quantity must be a positive whole number and include a product ID.",
    );
  const current = validateCart(cart);
  const existing =
    current.find((item) => item.productId === parsed.data.productId)
      ?.quantity ?? 0;
  return setCartQuantity(current, {
    productId: parsed.data.productId,
    quantity: existing + parsed.data.quantity,
  });
}

export function getCart(cart: Cart) {
  const items = validateCart(cart);
  const lines = items.map((item) => {
    const product = getProductDetails(item.productId);
    return {
      ...item,
      product,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    currency: "EUR" as const,
  };
}

export function prepareCheckout(cart: Cart) {
  const summary = getCart(cart);
  if (!summary.lines.length)
    throw new DomainError(
      "EMPTY_CART",
      "Add a product before reviewing your order.",
    );
  return summary;
}

// A single bad line (removed product, changed stock, duplicate) must not
// discard the whole saved cart. Bad lines are dropped, quantities clamped
// to stock and duplicates merged.
export function restoreCart(serialized: string | null): Cart {
  if (!serialized) return [];
  try {
    const saved = savedCartSchema.parse(JSON.parse(serialized));
    const merged = new Map<string, number>();
    for (const item of saved.items) {
      const line = addToCartSchema.safeParse(item);
      if (!line.success) continue;
      const product = catalog.find((entry) => entry.id === line.data.productId);
      if (!product) continue;
      const quantity = Math.min(
        (merged.get(product.id) ?? 0) + line.data.quantity,
        product.stock,
      );
      if (quantity > 0) merged.set(product.id, quantity);
    }
    return validateCart(
      [...merged].map(([productId, quantity]) => ({ productId, quantity })),
    );
  } catch {
    return [];
  }
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify({ version: 1, items: validateCart(cart) });
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
