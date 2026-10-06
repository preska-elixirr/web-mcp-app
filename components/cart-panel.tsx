"use client";

import { Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { type RefObject, ViewTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice, getCart } from "@/lib/domain";
import type { ShopAction, ShopState } from "@/lib/store";

export function CartPanel({
  state,
  send,
  headingRef,
}: {
  state: ShopState;
  send: (action: ShopAction) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const cart = getCart(state.cart);
  return (
    <aside
      className="min-w-0 lg:sticky lg:top-6 lg:self-start"
      aria-labelledby="cart-heading"
      id="cart"
    >
      <ViewTransition default="cart-transition">
        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2
              ref={headingRef}
              id="cart-heading"
              tabIndex={-1}
              className="flex items-center gap-2 text-lg font-semibold outline-offset-4"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              Your cart
            </h2>
            <Badge variant="secondary">
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            {!state.hydrated ? (
              <p className="py-6 text-sm text-muted-foreground">
                Loading your cart…
              </p>
            ) : cart.lines.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-9 text-center">
                <ShoppingBag
                  className="mx-auto mb-3 size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-medium">Room for good things.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a few essentials to get started.
                </p>
              </div>
            ) : (
              <ul className="space-y-5">
                {cart.lines.map((line) => (
                  <li key={line.productId}>
                    <ViewTransition default="cart-line-transition">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-medium">
                              {line.product.name}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatPrice(line.product.priceCents)} each
                            </p>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {formatPrice(line.lineTotalCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 rounded-lg border p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-12"
                              disabled={line.quantity === 1}
                              onClick={() =>
                                send({
                                  type: "adjust",
                                  productId: line.productId,
                                  delta: -1,
                                })
                              }
                              aria-label={`Decrease quantity of ${line.product.name}`}
                            >
                              <Minus aria-hidden="true" />
                            </Button>
                            <span className="min-w-5 text-center text-sm tabular-nums">
                              <span className="sr-only">Quantity: </span>
                              {line.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-12"
                              disabled={line.quantity === line.product.stock}
                              onClick={() =>
                                send({
                                  type: "adjust",
                                  productId: line.productId,
                                  delta: 1,
                                })
                              }
                              aria-label={`Increase quantity of ${line.product.name}`}
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-12 text-muted-foreground"
                            aria-label={`Remove ${line.product.name}`}
                            onClick={() =>
                              send({
                                type: "set",
                                productId: line.productId,
                                quantity: 0,
                              })
                            }
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </ViewTransition>
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-2xl tabular-nums">
                {formatPrice(cart.totalCents)}
              </span>
            </div>
            {state.review ? (
              <div className="space-y-3 rounded-xl bg-secondary p-4">
                <h3 className="font-semibold">Review your demo order</h3>
                <p className="text-sm text-muted-foreground">
                  {state.review.summary.itemCount} items ·{" "}
                  {formatPrice(state.review.summary.totalCents)}. Confirmation
                  creates a simulated receipt.
                </p>
                <Button
                  type="button"
                  className="min-h-12 w-full"
                  onClick={() => send({ type: "confirm" })}
                >
                  Confirm demo order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full"
                  onClick={() => send({ type: "cancel-review" })}
                >
                  Back to cart
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="min-h-12 w-full"
                disabled={!state.hydrated}
                onClick={() => send({ type: "review" })}
              >
                Review order
              </Button>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              Demo only. No payment, shipping, or real purchases.
            </p>
            {state.receipt && (
              <div className="space-y-2 rounded-xl bg-secondary p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Check className="size-4" aria-hidden="true" />
                  Demo receipt
                </h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {state.receipt.lines.map((line) => (
                    <li key={line.productId}>
                      {line.quantity} × {line.product.name}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium">
                  {formatPrice(state.receipt.totalCents)} · simulated
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </ViewTransition>
    </aside>
  );
}
