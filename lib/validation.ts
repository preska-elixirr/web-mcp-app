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
  query: z.string().max(200).optional(),
  category: z.enum(categories).optional(),
  connectivity: z.enum(connectivityOptions).optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  inStockOnly: z.boolean().optional(),
  sort: z.enum(["featured", "price_asc", "price_desc", "name"]).optional(),
});

export const addToCartSchema = z.strictObject({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const setCartQuantitySchema = addToCartSchema.extend({
  quantity: z.number().int().nonnegative(),
});

export const cartSchema = z.array(addToCartSchema).max(100);
export const savedCartSchema = z.strictObject({
  version: z.literal(1),
  items: z.array(z.unknown()).max(100),
});

export type Product = z.infer<typeof productSchema>;
export type SearchFilters = z.infer<typeof searchSchema>;
export type Cart = z.infer<typeof cartSchema>;
