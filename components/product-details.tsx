"use client";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  ZoomIn,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, ViewTransition } from "react";
import { categoryLabels } from "@/lib/catalog";
import { formatPrice } from "@/lib/domain";
import { productImage } from "@/lib/products";
import type { Product } from "@/lib/validation";
import { traceViewTransition } from "@/lib/view-transitions";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
export function ProductDetails({ product }: { product: Product }) {
  const { state, dispatch } = useShop();
  const [requested, setRequested] = useState(1);
  const inCart =
    state.cart.find((item) => item.productId === product.id)?.quantity ?? 0;
  const available = product.stock - inCart;
  // The selected quantity never exceeds what is still available.
  const quantity = Math.max(1, Math.min(requested, available));
  const setQuantity = (value: number) =>
    setRequested(Math.max(1, Math.min(value, available)));
  return (
    <>
      <section className="product-detail-layout">
        <ViewTransition
          name={`product-photo-${product.id}`}
          default="none"
          share="product-photo-morph"
          onShare={(instance) =>
            traceViewTransition("photo-share", instance.name)
          }
        >
          <div className="detail-photo">
            <Dialog>
              <DialogTrigger
                className="image-zoom"
                aria-label={`Enlarge photo of ${product.name}`}
              >
                <Image
                  src={productImage(product)}
                  alt={product.name}
                  width={1024}
                  height={1024}
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
                <span>
                  <ZoomIn size={18} />A closer look
                </span>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
                <DialogTitle>{product.name}</DialogTitle>
                <Image
                  src={productImage(product)}
                  alt={product.name}
                  width={1024}
                  height={1024}
                  sizes="90vw"
                />
              </DialogContent>
            </Dialog>
          </div>
        </ViewTransition>
        <div className="detail-copy">
          <p className="eyebrow">
            {categoryLabels[product.category]} / Office Supply
          </p>
          <h1>{product.name}</h1>
          <p className="detail-description">{product.description}</p>
          <p className="detail-price">{formatPrice(product.priceCents)}</p>
          <p className={`stock-label ${product.stock === 0 ? "sold-out" : ""}`}>
            <span />
            {product.stock > 0
              ? `In stock · ${product.stock} available`
              : "Currently sold out"}
          </p>
          <ul className="spec-preview">
            {product.specifications.map((spec) => (
              <li key={spec}>
                <Check size={16} />
                {spec}
              </li>
            ))}
          </ul>
          <div className="purchase-row">
            <div className="quantity-control">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={16} />
              </Button>
              <output aria-label="Quantity">{quantity}</output>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase quantity"
                disabled={quantity >= available}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>
            <Button
              className="min-h-13 flex-1"
              disabled={!state.hydrated || available <= 0}
              onClick={() =>
                dispatch({ type: "add", productId: product.id, quantity })
              }
            >
              {product.stock === 0
                ? "Sold out"
                : available === 0
                  ? "Stock limit reached"
                  : "Add to cart"}
              <Plus />
            </Button>
          </div>
          {inCart > 0 && (
            <Link href="/cart" className="text-link">
              {inCart} in your cart · View cart <ArrowRight size={16} />
            </Link>
          )}
          <div className="detail-benefits">
            <p>
              <Truck size={18} />
              Free standard delivery on orders €100+
            </p>
            <p>
              <ShieldCheck size={18} />
              Secure Stripe test payment
            </p>
          </div>
        </div>
      </section>
      <section className="product-information">
        <div>
          <p className="eyebrow">Made for your workday</p>
          <h2>The details make the difference.</h2>
          <p>
            {product.description} A practical addition to your workspace, chosen
            for a clear purpose.
          </p>
          <p className="muted">
            Fictional demo product. Images are AI generated and illustrate the
            catalog.
          </p>
        </div>
        <div>
          <h3>Specifications</h3>
          <dl>
            <div>
              <dt>Product code</dt>
              <dd>{product.id.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{categoryLabels[product.category]}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd className="capitalize">
                {product.connectivity === "none"
                  ? "Not required"
                  : product.connectivity}
              </dd>
            </div>
            {product.specifications.map((spec, index) => (
              <div key={spec}>
                <dt>Detail {index + 1}</dt>
                <dd>{spec}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3>Delivery & returns</h3>
          <p>
            Standard delivery is €4.90, or free over €100. Express delivery is
            €9.90.
          </p>
          <p>
            This shop is a demo: no goods are shipped and no real return is
            needed.
          </p>
          <Link className="text-link" href="/help#delivery">
            Delivery information <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
