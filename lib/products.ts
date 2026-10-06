import type { Product } from "./validation";
export function productSlug(product: Product): string {
  return product.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
}
export function productHref(product: Product): string {
  return `/products/${productSlug(product)}`;
}
export function productImage(product: Product): string {
  return `/products/${product.id}.webp`;
}
