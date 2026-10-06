import "server-only";
import Stripe from "stripe";
export function stripeConfigured(): boolean {
  return /^sk_test_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_SECRET_KEY ?? "");
}
export function getStripe(): Stripe {
  if (!stripeConfigured()) throw new Error("STRIPE_TEST_KEY_REQUIRED");
  return new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    maxNetworkRetries: 2,
    timeout: 15000,
  });
}
export function appOrigin(localOrigin?: string): string {
  const local =
    localOrigin &&
    ["http://localhost:3000", "http://127.0.0.1:3000"].includes(localOrigin)
      ? localOrigin
      : "http://localhost:3000";
  const url = new URL(process.env.APP_URL || local);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new Error("INVALID_APP_URL");
  return url.origin;
}
// For metadata only. Checkout still rejects a misconfigured APP_URL.
export function metadataOrigin(): string {
  try {
    return appOrigin();
  } catch {
    return "http://localhost:3000";
  }
}
export function allowedCheckoutOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const expected = appOrigin();
  if (origin === expected) return true;
  const configured = new URL(expected);
  return (
    configured.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(configured.hostname) &&
    ["localhost", "127.0.0.1"].some(
      (host) => origin === `http://${host}:${configured.port || "80"}`,
    )
  );
}
