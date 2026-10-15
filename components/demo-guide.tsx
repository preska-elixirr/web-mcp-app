"use client";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/domain";
import { useShop } from "./shop-provider";
import { Button } from "./ui/button";
import {
  ToolActivityActions,
  ToolActivityList,
  ToolCatalog,
  WebMcpStatus,
} from "./webmcp-activity";
import { type DemoScenario, useWebMcp } from "./webmcp-provider";

const scenarios: {
  id: DemoScenario;
  title: string;
  prompt: string;
  outcome: string;
}[] = [
  {
    id: "shopping",
    title: "Equip two colleagues",
    prompt:
      "Find the cheapest in-stock wireless keyboards and mice for two colleagues, within €180. Add two of each and prepare checkout.",
    outcome:
      "Two Air Wireless Keyboards and two Air Wireless Mice. €109.60 with free standard delivery. Opens the shop’s review page.",
  },
  {
    id: "stock",
    title: "Recover from unavailable stock",
    prompt:
      "Try to add more Air Wireless Keyboards than are in stock. Read the stock error, check that the cart is unchanged, then add two instead.",
    outcome:
      "An expected INSUFFICIENT_STOCK response with requested and available quantities, followed by a successful correction. €69.80 subtotal; €74.70 with standard delivery.",
  },
  {
    id: "adjust",
    title: "Change your mind",
    prompt:
      "Add four Air Wireless Mice. Change the final quantity to two and show the full cost with standard delivery.",
    outcome:
      "The quantity changes from four to two. €39.80 subtotal; €44.70 with standard delivery.",
  },
];

export function DemoGuide() {
  const {
    canRunScenario,
    definitions,
    scenario,
    pending,
    runNativeScenario,
    clearActivity,
  } = useWebMcp();
  const { dispatch, state } = useShop();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = scenario !== null || pending.length > 0 || !state.hydrated;
  return (
    <div className="prose-page">
      <section>
        <h2>What this browser can do</h2>
        <WebMcpStatus />
        <p>
          The API, the website and the agent each play a part. An enabled
          browser flag can make the API available to this page; a compatible
          agent still needs a way to discover and call its tools.
        </p>
        <p>
          The activity panel in the corner stays available throughout the shop,
          including after a return from Stripe.
        </p>
      </section>
      <section>
        <h2>Three conversations to explore</h2>
        <p>
          These are scripted in-page scenarios, not an embedded AI assistant.
          Each one clears the cart and activity, then calls the browser’s real
          WebMCP discovery and execution APIs. A compatible agent can also
          follow the prompts below independently.
        </p>
        <div className="webmcp-scenarios">
          {scenarios.map((item) => (
            <article key={item.id}>
              <h3>{item.title}</h3>
              <blockquote>{item.prompt}</blockquote>
              <p>{item.outcome}</p>
              <Button
                type="button"
                variant="outline"
                disabled={!canRunScenario || busy}
                onClick={async () => {
                  setError("");
                  setNotice("");
                  try {
                    await runNativeScenario(item.id);
                    setNotice(
                      `Completed: ${item.title}. The actual calls are recorded below.`,
                    );
                  } catch (issue) {
                    setError(
                      issue instanceof Error
                        ? issue.message
                        : "The native scenario could not complete.",
                    );
                  }
                }}
              >
                {scenario === item.id
                  ? "Running native calls…"
                  : "Reset & run scripted scenario"}
              </Button>
            </article>
          ))}
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <p role="status">{notice}</p>
        <p>
          The stock scenario intentionally produces one error. Successful
          recovery is visible in the subsequent calls. None of these scenarios
          creates a Stripe payment session.
        </p>
        <div className="webmcp-actions">
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              dispatch({ type: "reset" });
              dispatch({ type: "add", productId: "kb-air", quantity: 2 });
              dispatch({ type: "add", productId: "mouse-air", quantity: 2 });
              setNotice(
                "Example cart built through the normal shop interface. No WebMCP tools were called.",
              );
            }}
          >
            Build example cart through UI
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/cart" />}
          >
            View cart
          </Button>
        </div>
        <p>
          The UI example builds the same {formatPrice(10960)} product subtotal
          without calling WebMCP. It is a comparison, so it does not add tool
          activity.
        </p>
      </section>
      <section>
        <h2>Browser and agent setup</h2>
        <p>
          In the ChatGPT desktop app’s built-in browser, a compatible Work or
          Codex chat can discover the shop’s site tools. Browser API support and
          access through an external-browser extension are separate
          capabilities.
        </p>
        <p>
          For local Chrome or Edge experiments, a compatible browser build and
          the <code>#enable-webmcp-testing</code> flag may be needed. The
          official inspector or the scripted scenarios can exercise the page’s
          tools even when your preferred agent has no WebMCP integration.
        </p>
        <ul>
          <li>
            <a
              href="https://learn.chatgpt.com/docs/webmcp"
              target="_blank"
              rel="noreferrer"
            >
              OpenAI site tools: availability and supported browser
            </a>
          </li>
          <li>
            <a
              href="https://developer.chrome.com/docs/ai/webmcp"
              target="_blank"
              rel="noreferrer"
            >
              Chrome WebMCP: current browser and origin trial requirements
            </a>
          </li>
        </ul>
        <p>
          The shop works through its ordinary interface when WebMCP is
          unavailable. This page does not change browser settings or infer that
          an agent is connected.
        </p>
      </section>
      <section>
        <h2>Available tools ({definitions.length})</h2>
        <p>
          These definitions come from the same registry used for native
          registration. Expand a tool to see its parameters and annotations.
          Prices are integer EUR cents.
        </p>
        <ToolCatalog />
        <p>
          <code>add_to_cart</code> adds to an existing quantity.{" "}
          <code>set_cart_quantity</code> sets the final quantity, and{" "}
          <code>clear_cart</code> empties the cart. The latter two are safe to
          repeat for the same requested state.
        </p>
        <p>
          <code>get_checkout_summary</code> previews delivery and the final
          amount without creating a session. <code>prepare_checkout</code> opens
          shop review. <code>start_checkout</code> creates a Stripe test session
          and returns its URL for a person to open and pay.
        </p>
        <p>
          Identical <code>start_checkout</code> calls reuse an attempt ID while
          this document stays open, including after a timeout or cancelled
          request. A reload starts a new attempt. Cart or contact changes also
          start a different attempt. A cancelled request may already have
          reached Stripe; retrying identical details in the same page uses the
          same key.
        </p>
        <p>
          Tools share the interface’s validation and state. Annotations describe
          intended effects; application validation and server checks enforce the
          rules. Card details stay on Stripe.
        </p>
      </section>
      <section id="activity">
        <h2>Actual WebMCP activity</h2>
        <p>
          Entries are created only when a registered handler runs. They can come
          from an agent, an inspector or the scripted scenarios above; caller
          identity is not supplied by this integration. Previously saved entries
          do not count as calls in the current page session.
        </p>
        <ToolActivityActions />
        <ToolActivityList />
      </section>
      <section>
        <h2>Reset the demo</h2>
        <p>
          This clears the browser cart and this tab’s saved activity. Previously
          created Stripe test sessions remain in Stripe.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            dispatch({ type: "reset" });
            clearActivity();
            setNotice("Cart and activity reset.");
            setError("");
          }}
        >
          Reset cart & activity
        </Button>
      </section>
    </div>
  );
}
