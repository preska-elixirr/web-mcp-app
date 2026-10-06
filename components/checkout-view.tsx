"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, LockKeyhole, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  type CheckoutForm,
  cartSignature,
  checkoutFormSchema,
  checkoutTotals,
  shippingCost,
  shippingMethods,
} from "@/lib/checkout";
import { formatPrice, getCart } from "@/lib/domain";
import { productImage } from "@/lib/products";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function CheckoutView({ stripeReady }: { stripeReady: boolean }) {
  const { state, getState } = useShop();
  const cancelled = useSearchParams().get("cancelled") === "1";
  const [serverError, setServerError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", shippingMethod: "standard" },
  });
  const method = watch("shippingMethod");
  const cart = getCart(state.cart);
  const summary = cart.lines.length ? checkoutTotals(state.cart, method) : null;
  async function submit(values: CheckoutForm) {
    setServerError("");
    const currentCart = getState().cart;
    if (cartSignature(currentCart) !== cartSignature(state.cart)) {
      setServerError(
        "Your cart just changed. Review the updated order before continuing.",
      );
      return;
    }
    if (!currentCart.length) {
      setServerError(
        "Your cart is empty. Add an essential before checking out.",
      );
      return;
    }
    const payload = JSON.stringify({ ...values, cart: currentCart });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          cart: currentCart,
          attemptId: attempt.current.id,
        }),
      });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) {
        setServerError(
          result.error ?? "We could not start checkout. Please try again.",
        );
        return;
      }
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Unexpected payment URL");
      setRedirecting(true);
      window.location.assign(url.href);
    } catch {
      setServerError(
        "We could not connect to checkout. Your cart is still saved. Please try again.",
      );
    }
  }
  if (!state.hydrated)
    return (
      <p className="loading-state" role="status">
        Loading your checkout…
      </p>
    );
  if (!summary)
    return (
      <div className="empty-state">
        <ShoppingBag size={48} />
        <h1>Your cart is waiting.</h1>
        <p>Add an essential before checking out.</p>
        <Button nativeButton={false} render={<Link href="/shop" />}>
          Explore the shop <ArrowRight />
        </Button>
      </div>
    );
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">One last thoughtful step</p>
        <h1>Make it yours.</h1>
        <p>Review your essentials, then continue to secure test payment.</p>
      </div>
      <ol className="checkout-steps" aria-label="Checkout steps">
        <li>
          01 <Link href="/cart">Cart</Link>
        </li>
        <li aria-current="step">02 Contact & delivery</li>
        <li>03 Stripe test payment</li>
      </ol>
      {cancelled && (
        <div className="notice" role="status">
          Payment was cancelled. Your cart is saved, and you can try again
          whenever you are ready.
        </div>
      )}
      {!stripeReady && (
        <div className="notice">
          Stripe test checkout is not connected yet. You can review your order
          here; payment becomes available when the shop owner adds a Stripe test
          key.
        </div>
      )}
      <div className="checkout-layout">
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="checkout-form"
        >
          <section>
            <p className="eyebrow">01 / A little introduction</p>
            <h2>Contact details</h2>
            <div className="field">
              <label htmlFor="checkout-name">Full name</label>
              <Input
                id="checkout-name"
                autoComplete="name"
                placeholder="Your full name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="name-error" className="field-error" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="checkout-email">Email address</label>
              <Input
                id="checkout-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : "email-note"}
                {...register("email")}
              />
              {errors.email ? (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-note" className="field-note">
                  Used for this test checkout only.
                </p>
              )}
            </div>
          </section>
          <section>
            <p className="eyebrow">02 / Choose your pace</p>
            <h2>Delivery</h2>
            <fieldset className="delivery-options">
              <legend className="sr-only">Delivery method</legend>
              {Object.entries(shippingMethods).map(([id, shipping]) => (
                <label
                  key={id}
                  className={`delivery-option ${method === id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    value={id}
                    {...register("shippingMethod")}
                  />
                  <span>
                    <strong>{shipping.label}</strong>
                    <small>{shipping.estimate} · demo estimate</small>
                  </span>
                  <strong>
                    {shippingCost(
                      summary.subtotalCents,
                      id as keyof typeof shippingMethods,
                    ) === 0
                      ? "Free"
                      : formatPrice(shipping.feeCents)}
                  </strong>
                </label>
              ))}
            </fieldset>
            <p className="field-note">
              Enter your delivery address on the next step, securely with
              Stripe. Demo delivery is available in Croatia, Slovenia, Germany,
              Austria and Italy.
            </p>
          </section>
          <section>
            <p className="eyebrow">03 / Secure checkout</p>
            <h2>Payment</h2>
            <div className="payment-note">
              <LockKeyhole size={22} />
              <div>
                <strong>Powered by Stripe</strong>
                <p>
                  Your card and address are entered on Stripe’s hosted test
                  payment page.
                </p>
              </div>
              <span className="demo-pill">Test mode</span>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                aria-invalid={!!errors.acknowledgeDemo}
                aria-describedby={
                  errors.acknowledgeDemo ? "demo-error" : undefined
                }
                {...register("acknowledgeDemo")}
              />
              <span>
                I understand this is a test order. No real payment or delivery
                will take place.
              </span>
            </label>
            {errors.acknowledgeDemo && (
              <p id="demo-error" className="field-error" role="alert">
                {errors.acknowledgeDemo.message}
              </p>
            )}
            {serverError && (
              <p className="notice error-notice" role="alert">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              disabled={!stripeReady || isSubmitting || redirecting}
              className="min-h-13 w-full"
            >
              {redirecting
                ? "Opening Stripe…"
                : isSubmitting
                  ? "Preparing checkout…"
                  : `Continue to Stripe · ${formatPrice(summary.totalCents)}`}
              <ArrowRight />
            </Button>
            <Link href="/cart" className="text-link">
              <ArrowLeft size={16} />
              Back to your cart
            </Link>
          </section>
        </form>
        <aside className="order-summary checkout-summary">
          <p className="eyebrow">Your next essentials</p>
          <h2>Order summary</h2>
          <div className="checkout-items">
            {summary.lines.map((line) => (
              <div key={line.productId}>
                <Image
                  src={productImage(line.product)}
                  alt={line.product.name}
                  width={80}
                  height={80}
                  sizes="64px"
                />
                <span>
                  <strong>{line.product.name}</strong>
                  <small>Qty {line.quantity}</small>
                </span>
                <strong>{formatPrice(line.lineTotalCents)}</strong>
              </div>
            ))}
          </div>
          <dl className="summary-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(summary.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{shippingMethods[method].label}</dt>
              <dd>
                {summary.shippingCents === 0
                  ? "Free"
                  : formatPrice(summary.shippingCents)}
              </dd>
            </div>
            <div className="grand-total">
              <dt>Total</dt>
              <dd>{formatPrice(summary.totalCents)}</dd>
            </div>
          </dl>
          <p className="summary-note">
            EUR · Demo prices. No additional tax is applied to this test
            checkout.
          </p>
          <div className="test-card-note">
            <strong>Try a test card</strong>
            <code>4242 4242 4242 4242</code>
            <p>
              Any future expiry and any 3-digit CVC.
              <br />
              Use fictional contact and address details.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
