"use client";
import { ArrowUpRight, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { categoryLabels } from "@/lib/catalog";
import { formatPrice } from "@/lib/domain";
import { productHref, productImage } from "@/lib/products";
import type { Product } from "@/lib/validation";
import { traceViewTransition } from "@/lib/view-transitions";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
export function ProductCard({ product }: { product: Product }) {
  const { state, dispatch } = useShop();
  const quantity =
    state.cart.find((item) => item.productId === product.id)?.quantity ?? 0;
  return (
    <article className="product-card">
      <ViewTransition
        name={`product-photo-${product.id}`}
        default="none"
        share="product-photo-morph"
        onShare={(instance) =>
          traceViewTransition("photo-share", instance.name)
        }
      >
        <Link
          href={productHref(product)}
          className="product-photo"
          aria-label={`View ${product.name}`}
        >
          <Image
            src={productImage(product)}
            alt={product.name}
            width={1024}
            height={1024}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
          />
          {product.stock === 0 && <span className="photo-badge">Sold out</span>}
          <span className="photo-arrow">
            <ArrowUpRight size={20} />
          </span>
        </Link>
      </ViewTransition>
      <div className="product-card-content">
        <p className="eyebrow">
          {categoryLabels[product.category]}
          {product.connectivity !== "none" ? ` / ${product.connectivity}` : ""}
        </p>
        <h3>
          <Link href={productHref(product)}>{product.name}</Link>
        </h3>
        <p className="product-description">{product.description}</p>
        <div className="product-card-bottom">
          <span className="price">{formatPrice(product.priceCents)}</span>
          <Button
            variant="outline"
            size="icon"
            className="add-product"
            aria-label={`Add ${product.name} to cart`}
            disabled={!state.hydrated || quantity >= product.stock}
            onClick={() =>
              dispatch({ type: "add", productId: product.id, quantity: 1 })
            }
          >
            <Plus />
          </Button>
        </div>
      </div>
    </article>
  );
}
