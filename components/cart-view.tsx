"use client";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, ViewTransition } from "react";
import { shippingCost } from "@/lib/checkout";
import { formatPrice, getCart } from "@/lib/domain";
import { productHref, productImage } from "@/lib/products";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
export function CartView() {
  const { state, dispatch } = useShop();
  const summary = getCart(state.cart);
  const heading = useRef<HTMLHeadingElement>(null);
  if (!state.hydrated)
    return (
      <p className="loading-state" role="status">
        Loading your cart…
      </p>
    );
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">A little closer to a better desk</p>
        <h1 ref={heading} tabIndex={-1}>
          Your cart<span className="heading-count">{summary.itemCount}</span>
        </h1>
        <p>Good choices, all in one place.</p>
      </div>
      {summary.lines.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} strokeWidth={1} />
          <h2>Room for your next essential.</h2>
          <p>Your cart is empty. Find something that makes work feel better.</p>
          <Button nativeButton={false} render={<Link href="/shop" />}>
            Explore the shop <ArrowRight />
          </Button>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-table-heading">
              <span>Essential</span>
              <span>Quantity / total</span>
            </div>
            <ViewTransition>
              <div className="cart-lines">
                {summary.lines.map((line) => (
                  <ViewTransition key={line.productId}>
                    <article className="cart-line">
                      <Link
                        href={productHref(line.product)}
                        className="cart-line-photo"
                      >
                        <Image
                          src={productImage(line.product)}
                          alt={line.product.name}
                          width={160}
                          height={160}
                          sizes="120px"
                        />
                      </Link>
                      <div className="cart-line-copy">
                        <h2>
                          <Link href={productHref(line.product)}>
                            {line.product.name}
                          </Link>
                        </h2>
                        <p>{formatPrice(line.product.priceCents)} each</p>
                        <Button
                          variant="ghost"
                          className="remove-item"
                          onClick={() => {
                            dispatch({
                              type: "set",
                              productId: line.productId,
                              quantity: 0,
                            });
                            heading.current?.focus();
                          }}
                          aria-label={`Remove ${line.product.name}`}
                        >
                          <Trash2 size={14} />
                          Remove
                        </Button>
                      </div>
                      <div className="cart-line-controls">
                        <div className="quantity-control">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Decrease ${line.product.name} quantity`}
                            disabled={line.quantity <= 1}
                            onClick={() =>
                              dispatch({
                                type: "adjust",
                                productId: line.productId,
                                delta: -1,
                              })
                            }
                          >
                            <Minus size={16} />
                          </Button>
                          <output aria-label={`${line.product.name} quantity`}>
                            {line.quantity}
                          </output>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Increase ${line.product.name} quantity`}
                            disabled={line.quantity >= line.product.stock}
                            onClick={() =>
                              dispatch({
                                type: "adjust",
                                productId: line.productId,
                                delta: 1,
                              })
                            }
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                        <strong>{formatPrice(line.lineTotalCents)}</strong>
                      </div>
                    </article>
                  </ViewTransition>
                ))}
              </div>
            </ViewTransition>
            <Link href="/shop" className="text-link continue-shopping">
              <ArrowLeft size={16} />
              Keep exploring
            </Link>
          </div>
          <aside className="order-summary">
            <p className="eyebrow">The good stuff, added up</p>
            <h2>Order summary</h2>
            <dl className="summary-totals">
              <div>
                <dt>Subtotal ({summary.itemCount} items)</dt>
                <dd>{formatPrice(summary.totalCents)}</dd>
              </div>
              <div>
                <dt>Standard delivery</dt>
                <dd>
                  {shippingCost(summary.totalCents, "standard") === 0
                    ? "Free"
                    : formatPrice(shippingCost(summary.totalCents, "standard"))}
                </dd>
              </div>
              <div className="grand-total">
                <dt>Total</dt>
                <dd>
                  {formatPrice(
                    summary.totalCents +
                      shippingCost(summary.totalCents, "standard"),
                  )}
                </dd>
              </div>
            </dl>
            {summary.totalCents < 10000 ? (
              <p className="shipping-hint">
                You are {formatPrice(10000 - summary.totalCents)} away from free
                standard delivery.
              </p>
            ) : (
              <p className="shipping-hint">
                Your order qualifies for free standard delivery.
              </p>
            )}
            <Button
              className="min-h-13 w-full"
              nativeButton={false}
              render={<Link href="/checkout" />}
            >
              Continue to checkout <ArrowRight />
            </Button>
            <p className="summary-note">
              Delivery choice at checkout. Stripe test payments only. No real
              purchase.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
