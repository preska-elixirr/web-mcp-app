"use client";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/domain";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
import { useWebMcp } from "./webmcp-provider";
export function DemoGuide() {
  const { support, activity, clearActivity, runNativeScenario } = useWebMcp();
  const { dispatch } = useShop();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="prose-page">
      <div className="notice">
        <strong>
          Native WebMCP:{" "}
          {support === "available"
            ? "six tools registered"
            : support === "unavailable"
              ? "unavailable in this browser"
              : support === "failed"
                ? "registration failed"
                : "checking browser support"}
        </strong>
        <p>
          The shop remains usable through its normal interface in every
          supported browser.
        </p>
      </div>
      <section>
        <h2>A repeatable shopping scenario</h2>
        <p>
          “I need equipment for two new colleagues: two wireless keyboards and
          two wireless mice, with a budget of €180. Choose the cheapest in-stock
          combination and prepare checkout for review.”
        </p>
        <p>
          The expected cart contains two Air Wireless Keyboards and two Air
          Wireless Mice. Product subtotal: <strong>{formatPrice(10960)}</strong>
          . Standard delivery is free. Payment remains a manual step.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={running}
            onClick={() => {
              dispatch({ type: "reset" });
              dispatch({ type: "add", productId: "kb-air", quantity: 2 });
              dispatch({ type: "add", productId: "mouse-air", quantity: 2 });
            }}
          >
            Reset & build example cart
          </Button>
          <Button
            variant="outline"
            disabled={support !== "available" || running}
            onClick={async () => {
              setRunning(true);
              setError("");
              try {
                await runNativeScenario();
              } catch (issue) {
                setError(
                  issue instanceof Error
                    ? issue.message
                    : "Native tools could not run.",
                );
              } finally {
                setRunning(false);
              }
            }}
          >
            {running
              ? "Running native tools…"
              : "Reset & run via native WebMCP"}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/cart" />}
          >
            View cart
          </Button>
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </section>
      <section>
        <h2>Browser setup</h2>
        <ol>
          <li>
            Use a Chrome version with the current WebMCP API. For local
            development, enable{" "}
            <code>chrome://flags/#enable-webmcp-testing</code> and relaunch
            Chrome.
          </li>
          <li>Open this shop and check the native support indicator above.</li>
          <li>
            Use the official Model Context Tool Inspector extension or the
            native scenario button to discover and call tools.
          </li>
        </ol>
        <p>
          See{" "}
          <a
            href="https://developer.chrome.com/docs/ai/webmcp"
            target="_blank"
            rel="noreferrer"
          >
            Chrome’s official WebMCP setup guide
          </a>{" "}
          for current browser and origin-trial requirements. No browser settings
          are changed by this site.
        </p>
      </section>
      <section>
        <h2>Available tools</h2>
        <ul>
          <li>
            <code>search_products</code> — combined filters, unit prices in EUR
            cents.
          </li>
          <li>
            <code>get_product_details</code> — specifications, stock and product
            page.
          </li>
          <li>
            <code>add_to_cart</code> — add a positive integer quantity.
          </li>
          <li>
            <code>set_cart_quantity</code> — set the absolute quantity; zero
            removes.
          </li>
          <li>
            <code>get_cart</code> — current quantities and product subtotal.
          </li>
          <li>
            <code>prepare_checkout</code> — validate the cart and open human
            review.
          </li>
          <li>
            <code>start_checkout</code> — skip the form: contact details and
            delivery in, Stripe test payment URL out.
          </li>
        </ul>
        <p>
          The tools use the same stock checks and cart operations as the
          interface. None accepts card details or confirms payment. Only{" "}
          <code>start_checkout</code> creates a Stripe test payment session, and
          a human still pays on Stripe’s page.
        </p>
      </section>
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2>Tool activity</h2>
          <Button variant="outline" onClick={clearActivity}>
            Clear activity
          </Button>
        </div>
        <p>
          The last 20 native tool calls from this tab are shown below. Activity
          is not saved across reloads.
        </p>
        {activity.length === 0 ? (
          <p>No native tool calls yet.</p>
        ) : (
          activity.map((entry) => (
            <details key={entry.id} className="tool-activity">
              <summary>
                <strong>{entry.name}</strong>
                <span>
                  {entry.success ? "Success" : "Error"} · {entry.durationMs} ms
                  · {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </summary>
              <pre>
                {JSON.stringify(
                  { input: entry.input, output: JSON.parse(entry.output) },
                  null,
                  2,
                )}
              </pre>
            </details>
          ))
        )}
      </section>
      <section>
        <h2>Reset the demo</h2>
        <p>
          This clears this browser’s cart and the visible tool activity. Stripe
          test sessions already created remain in the Stripe dashboard.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            dispatch({ type: "reset" });
            clearActivity();
          }}
        >
          Reset cart & activity
        </Button>
      </section>
    </div>
  );
}
