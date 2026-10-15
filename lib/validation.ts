import { z } from "zod";

export const categories = [
  "keyboards",
  "mice",
  "monitors",
  "accessories",
] as const;
export const connectivityOptions = ["wireless", "wired", "none"] as const;

export const productSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(categories),
  connectivity: z.enum(connectivityOptions),
  priceCents: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  description: z.string().min(1),
  specifications: z.array(z.string().min(1)).min(1),
});

export const searchSchema = z.strictObject({
  query: z
    .string()
    .max(200)
    .describe(
      "Text matched against product names, descriptions and specifications.",
    )
    .optional(),
  category: z
    .enum(categories)
    .describe("Product category. Omit to search all categories.")
    .optional(),
  connectivity: z
    .enum(connectivityOptions)
    .describe("Connection type; none means no connection is needed.")
    .optional(),
  maxPriceCents: z
    .number()
    .int()
    .nonnegative()
    .describe("Maximum unit price in EUR cents, for example 5000 for €50.00.")
    .optional(),
  inStockOnly: z
    .boolean()
    .describe("When true, exclude products with zero stock.")
    .optional(),
  sort: z
    .enum(["featured", "price_asc", "price_desc", "name"])
    .describe(
      "Result ordering. price_asc finds the cheapest; price_desc finds the most expensive.",
    )
    .optional(),
});

export const addToCartSchema = z.strictObject({
  productId: z
    .string()
    .min(1)
    .max(100)
    .describe("Product ID returned by search_products, for example mouse-air."),
  quantity: z
    .number()
    .int()
    .positive()
    .describe(
      "Units to add to the existing quantity. This is additive, so repeating the call adds again.",
    ),
});

export const setCartQuantitySchema = addToCartSchema.extend({
  quantity: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Final quantity for this product, not an increment. Zero removes it. Repeating the same value keeps that quantity.",
    ),
});

export const cartSchema = z.array(addToCartSchema).max(100);
export const savedCartSchema = z.strictObject({
  version: z.literal(1),
  items: z.array(z.unknown()).max(100),
});

export type Product = z.infer<typeof productSchema>;
export type SearchFilters = z.infer<typeof searchSchema>;
export type Cart = z.infer<typeof cartSchema>;
