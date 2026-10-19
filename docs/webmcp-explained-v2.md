# WebMCP in practice: nine tools, one cart and a human at checkout

*How a Next.js shop exposes nine real operations to browser agents, keeps one shared cart and leaves payment to a person. Checked on 18 October 2026 with Next.js 16.3.8, React 19.3.0, Zod 4.6.5 and Chrome's current WebMCP implementation.*

## What WebMCP is

WebMCP is a browser API that lets a web page expose a fixed set of named tools to an agent. A tool is a JavaScript function with a name, a title, a description, a JSON Schema for its input, optional annotations and an `execute` function. The page registers the tool on `document.modelContext`; the browser keeps the list; an agent that the browser trusts discovers the list with `getTools()` and invokes a tool with `executeTool()`.

The tools belong to the page. They are defined in the page's JavaScript, they run in the page's execution context, and they exist only while that document is alive. The browser is the broker: it decides which agent can see the list and mediates each call. The user stays in the tab with the session they already have, so there is no new OAuth app, no token store and no JSON-RPC between the page and the agent.

This is not computer use or screenshot-driven browser automation. Computer use drives a page through screenshots, clicks and coordinates; WebMCP gives the agent a predefined method with typed arguments and a structured result. The agent does not look for a button or guess what a form field means; it calls `add_to_cart` or `get_checkout_summary` and gets an answer. The trade-off is that the page has to define those methods in advance; WebMCP is a small, page-defined surface, not a general browser-control API. A page that registers nothing gives the agent nothing to call.

The name is also easy to confuse with MCP. MCP is a wire protocol; WebMCP is a browser API. The browser may translate page tools into MCP for an agent, but the page itself does not speak MCP. The two share a tool vocabulary, not a transport or a lifetime; the comparison later in this article covers the details.

For any of this to work, three things have to line up. The browser has to expose the API, the page has to register tools, and an agent has to be present to discover and call them. If the browser does not expose the API, `document.modelContext` is undefined and the page's registration code is skipped. If the page registers tools but no agent is present, the tools exist and are never called.

### Where it runs today

As of 18 October 2026:

- The specification is a Draft Community Group Report from the W3C Web Machine Learning Community Group; the latest draft is dated 16 October 2026. It is not a W3C Standard and not on the W3C Standards Track. A Working Group would have to take it up before it could become a Working Draft.
- Chrome made WebMCP available for early preview in Chrome 146 on 10 February 2026. The Intent to Experiment, filed on 15 May 2026, estimated an origin trial from Chrome 149 to Chrome 156 and a ship target of Chrome 157. The current entry point is `document.modelContext`; Chrome 150 kept `navigator.modelContext` as a deprecated alias and Chrome 153 removed it.
- Edge opened a separate origin trial in Edge 150 and made its implementation ready for testing in September 2026.
- ChatGPT's desktop built-in browser supports site tools in ChatGPT Work and Codex, since August 2026. Access is limited to certain models and workspace plans, and the implementation sees only imperative tools in the top-level page, not declarative forms or tools inside iframes.
- Shopify turned on ten storefront tools on every Liquid storefront and in the Hydrogen developer preview on 5 August 2026, then checkout tools on 28 September 2026. Liip's ZüriCityGPT was an earlier, smaller deployment: three tools in February 2026, reusing its MCP schemas.
- Mozilla's position is neutral and WebKit's is oppose. Both came with detailed written rationales; neither is a silent "no signal".
- Outside the big browsers, Brave's Leo has experimental support and Meta's Ray-Ban Display is listed as coming.

| Surface | Status | What it means |
| --- | --- | --- |
| Chrome 149–156 | Origin trial | A token enables the API for your origin; the flag is for local work |
| Edge 150 | Origin trial | Separate registration and token |
| ChatGPT desktop | Shipping, limited | Imperative top-level tools only; model and workspace gated |
| Firefox, Safari | No implementation | A polyfill can create the API, but not an agent |

### How it got here

WebMCP has an unusual origin. Alex Nahas, then a backend engineer at Amazon, built MCP-B in early 2025 to get around MCP's OAuth 2.1 requirement. In his version, the page became the MCP server, a Chrome extension carried messages to the agent, and authentication was whatever cookies the tab already had.

Google's Chrome team was prototyping "script tools" at the same time, while Microsoft's Edge team was working on "Web Model Context". The two teams published a joint explainer on 13 August 2025, and the W3C Web Machine Learning Community Group took it on as a deliverable in September 2025. Nahas joined the work; the MCP-B extension is no longer open source, the API work moved to the W3C repository, and the open-source packages moved to the WebMCP org.

The name survived, which is why a browser API carries the initials of a client-server protocol it does not implement. The entry point did not. It started as `window.agent`, became `navigator.modelContext` for the first Chrome preview, and moved to `document.modelContext` in the spec draft of 27 May 2026, on the argument that tools belong to a page rather than to the browser.

## How to use it from your agent

The setup that has worked best for me is the OpenAI Codex harness with its integrated browser. There, the WebMCP flag is already on by default, so I can open a page, ask Codex to do something, and watch it discover the page's tools without installing a separate extension. The browser provides the API, the page provides the tools and Codex provides the agent.

Claude Code desktop is a different story. Its built-in browser does not expose WebMCP, so the same page gives it nothing to call. To use WebMCP from Claude Code desktop, I open Chromium with the WebMCP flag enabled and install the official Anthropic browser extension. The extension is the piece that can see and call the page's tools; Claude Code supplies the model and the task. The flag and the extension are both necessary, and they solve different problems.

Cursor's built-in browser has the same limitation. In my testing, it does not expose WebMCP either, so the page's tools stay invisible there even when the page is open. Cursor has no extension that would let its agent reach a page's WebMCP methods.

That split is the part that is easy to miss. The page registers its tools when it loads, but the registration is gated by the browser API. If the flag is off, `document.modelContext` is undefined, the page's feature detection falls through and no tools appear; the agent has no list to search or call. Turn the flag on and the page can register, but the tools are still inert until an agent is present to call them. The agent can be built into the harness or supplied by an extension; either way, something in the browser has to read `getTools()` and call `executeTool()`.

A practical check is to open the page's demo or inspector after enabling the flag. You should see the tool count and the schemas. If the API is available but the count is zero, the page did not register; if the count is nine but no calls arrive, the page is ready and the agent is missing or has not been asked. This is why the demo shows registration and observed calls as separate signals.

| Setup | Browser | What you need |
| --- | --- | --- |
| OpenAI Codex harness | Integrated browser | WebMCP flag enabled; in my setup it is on by default |
| Claude Code desktop | Chromium + official Anthropic extension | Built-in browser lacks WebMCP; official extension plus flag |
| Cursor | Built-in browser | No WebMCP in the built-in browser and no extension path |
| Chrome, local | Chrome | `chrome://flags/#enable-webmcp-testing`, plus an agent extension or inspector |
| ChatGPT desktop | Built-in browser | Site tools enabled; model and workspace gates apply |

In practice, the sequence is short: enable the browser API, open the page so it registers its tools, attach an agent, then ask for the task. The `/demo` page is the check for the first two steps; the activity panel is the check for the last two.

None of this is computer use. There is no screenshot loop and no coordinate guessing. The agent calls the predefined methods the page registered, and the methods run in the page. If the page has not defined a method for the task, the agent cannot invent one through WebMCP; it has to fall back to ordinary browsing or computer use.

## The demo

Office Supply is a fictional office-supply shop. It has a catalog of 24 products, category and price filters, product pages, a persistent cart, a checkout form and a Stripe test checkout path that activates when a test key is configured. There is no database, no login and no real fulfillment.

A person and an agent can do the same first steps. They search the same catalog, add to the same cart and read the same totals. The agent can prepare checkout and create a Stripe test session. It cannot enter card details or mark an order paid; that happens on Stripe's hosted page, with the person.

- Live demo: [web-mcp-app.vercel.app](https://web-mcp-app.vercel.app/)
- Source code: [github.com/preska-elixirr/web-mcp-app](https://github.com/preska-elixirr/web-mcp-app)

| Part | Pinned release |
| --- | --- |
| Next.js | 16.3.8, App Router |
| React / React DOM | 19.3.0 |
| TypeScript | 7.0.2 |
| Tailwind CSS / PostCSS | 4.3.3 |
| Zod | 4.6.5 |
| React Hook Form / resolvers | 7.89.0 / 5.9.1 |
| Stripe Node SDK | 23.0.0 |
| Vitest / Biome | 5.0.3 / 2.5.15 |

The WebMCP integration has no polyfill and no separate backend. The tools call the same `lib/domain.ts` functions the buttons call, and the checkout tool posts to the same `/api/checkout` route as the form.

| Route | What it does |
| --- | --- |
| `/` | Homepage, categories and featured products |
| `/shop` | All 24 products, filters and sorting |
| `/products/[slug]` | Product details, stock and quantity |
| `/cart` | Quantity changes, removal and totals |
| `/checkout` | Contact, delivery and Stripe test payment |
| `/demo` | Registration status, scenarios, schemas and activity |

The `/demo` page is the presentation surface. A panel in the lower corner stays available on shop routes and shows what actually ran: registration count, calls in the current document, pending calls and a redacted transcript.

To try the native tools, use a browser with WebMCP enabled. In Chrome, `chrome://flags/#enable-webmcp-testing` is the local path; a public origin needs an origin trial token or a browser that has shipped the API. A Chrome origin trial token can be delivered as an `Origin-Trial` response header or a `<meta http-equiv="origin-trial" content="...">` tag, and it is bound to the origin. Local flag testing does not need a token; Edge uses its own trial and token. In the ChatGPT desktop app, a compatible Work or Codex chat can use site tools. The shop works through its ordinary interface when WebMCP is unavailable.

<!-- SCREENSHOT 1: the /demo page with the WebMCP status and three scenarios. Suggested caption: "The demo separates browser support, registration and observed calls." -->

## Why this is not an MCP server

With the definition out of the way, the MCP comparison is worth spelling out. MCP is a wire protocol: JSON-RPC 2.0 over stdio or Streamable HTTP, with tools, resources and prompts. WebMCP is a browser API on `Document`. The browser may translate page tools into MCP for an agent, but the page does not speak MCP.

The overlap is the tool vocabulary. Both have `name`, `title`, `description`, `inputSchema` and `annotations`. MCP also has `outputSchema` and `_meta`; WebMCP adds the `execute` function. The transports, lifetimes and auth are different.

|  | Classic endpoint | MCP server | WebMCP |
| --- | --- | --- | --- |
| Where the code runs | Your server | Your server | The user's page |
| Who can call it | Any client with credentials | Any MCP client | A browser agent on this page |
| Authentication | API key or OAuth, built by you | OAuth, bearer tokens, API keys | The page's existing session |
| Discovery | OpenAPI, docs, a registry | `tools/list` | `getTools()` |
| Lifetime | Always on | While the server runs | While the document is alive |
| User presence | Not required | Not required | Required |
| Good for | Batch work, machine to machine | Background, headless work | One user, one task, in context |

That is why the demo has no MCP server. The cart already exists in the page. The session already exists in the browser. Adding an MCP server would mean duplicating the cart, the catalog and the auth path on a backend, then keeping the two in sync. For a shop where the user is looking at the page, that is the wrong shape.

It is also why WebMCP does not replace a backend API. The tools call the same validated functions the UI calls. The server still validates prices, stock and checkout input. WebMCP changes who can invoke the logic, not who is allowed to do what.

## The tool surface

Office Supply registers nine tools. They are deliberately narrow: four reads, three cart mutations, one review step and one payment handoff.

| Tool | Kind | What it does | Annotation |
| --- | --- | --- | --- |
| `search_products` | Read | Filters the catalog by text, category, connection, price and stock; returns IDs, stock and links | `readOnlyHint: true` |
| `get_product_details` | Read | Returns specifications, unit price in EUR cents and stock for one product | `readOnlyHint: true` |
| `get_cart` | Read | Returns lines, quantities, item count and product subtotal | `readOnlyHint: true` |
| `get_checkout_summary` | Read | Previews delivery, fees, final total and cart signature for a shipping method | `readOnlyHint: true` |
| `add_to_cart` | Write | Adds a positive quantity to the existing quantity, subject to stock | `readOnlyHint: false` |
| `set_cart_quantity` | Write | Sets an absolute quantity; zero removes the line | `readOnlyHint: false` |
| `clear_cart` | Write | Empties the cart; repeating keeps it empty | `readOnlyHint: false` |
| `prepare_checkout` | Review | Validates the cart and opens `/checkout` for human review | `readOnlyHint: false` |
| `start_checkout` | Payment handoff | Creates a Stripe test session and returns its URL and totals | `consequentialHint: true` |

Two decisions shape the surface. `start_checkout` is the only consequential tool: `prepare_checkout` changes the page and opens review, but it does not create a payment session or charge anything, while the cart mutations are cheap to change and visible in the UI. The annotation follows the effect, not the verb. The second decision is the absence of `confirm_payment`: the tool surface stops at a Stripe URL. The agent can create the session; a person opens it, enters the card and address on Stripe's hosted page and pays. That absence is the design, not an omission.

The reads are split for a reason. `search_products` returns summaries and links, not full specifications; `get_product_details` is the second call. That keeps the first result small enough for a model to scan. `get_cart` returns the product subtotal only, because delivery has not been chosen yet. `get_checkout_summary` takes a `shippingMethod` and adds the fee, so the full cost is never a hidden assumption.

All amounts are integer EUR cents. Standard delivery is €4.90, free at a €100 product subtotal. Express is €9.90. `start_checkout` also requires `acknowledgeDemo: true`. The acknowledgement is part of the schema, not a prompt instruction.

Eight of the nine tools do their work in the page. `start_checkout` is the only one that calls `/api/checkout`.

## Registration

The integration is a client component mounted in the root layout, inside the shop provider. It feature-detects `document.modelContext`, registers the tools and aborts the whole set on unmount.

```tsx
useEffect(() => {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;

  if (!context || typeof context.registerTool !== "function") {
    setSupport("unavailable");
    return;
  }

  const controller = new AbortController();
  setSupport("checking");

  registerShopTools(context, tools, controller.signal, () => {
    if (!controller.signal.aborted) setRegisteredCount((count) => count + 1);
  })
    .then(() => {
      if (!controller.signal.aborted) setSupport("available");
    })
    .catch(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setRegisteredCount(0);
      setSupport("failed");
    });

  return () => controller.abort();
}, [tools]);
```

`registerShopTools` is a small loop:

```ts
export async function registerShopTools(
  context: ModelContext,
  tools: WebTool[],
  signal: AbortSignal,
  registered?: () => void,
): Promise<void> {
  for (const tool of tools) {
    if (signal.aborted) return;
    await context.registerTool(tool, { signal });
    if (!signal.aborted) registered?.();
  }
}
```

The signal is how the tool list follows the document. There is no `unregisterTool()` in the current draft; aborting the registration signal removes the tools. That matters when the component that owns the registration unmounts: in a per-route setup, a route change would abort the signal and clear the list.

This demo does not work that way. The provider sits above the routes, so the nine tools stay registered while the visitor moves from `/shop` to a product page, the cart and checkout. The tool closures read `getState()` at call time, so they see the latest cart without re-registering on every change. This is why the demo does not use the `toolchange` event: the list is stable, and the state behind it is not. The abort path matters when the whole shop unmounts, or when a later change registers route-specific tools.

Two details keep the registration honest. The provider counts registrations separately from calls, so "9 / 9 registered" does not imply that an agent is connected. And the tools refuse to run before the cart is hydrated:

```ts
if (!bridge.getState().hydrated)
  throw new DomainError(
    "INVALID_CART",
    "The cart is still loading. Retry shortly.",
  );
```

Without that guard, an agent could call `get_cart` before `localStorage` has been read, see an empty cart and make a decision on a false state. The guard turns a race into a recoverable error.

The demo also handles a browser difference in `executeTool()`. Current Chrome accepts an object for the input arguments; some older builds expected JSON text. The adapter is `executeNativeTool` in `lib/webmcp.ts`; it wraps the browser call for the demo's in-page scenario runner and retries with `JSON.stringify(input)` only when the error is the argument-parsing error, never after a tool handler has run:

```ts
try {
  return await context.executeTool(tool, input);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("Failed to parse input arguments")) throw error;
  return context.executeTool(tool, JSON.stringify(input));
}
```

The wrapper is demo code, not part of the browser API; it exists because the runner needs to work across Chrome builds.

That distinction matters. A retry after a parsing failure is safe. A retry after an execution failure can duplicate an additive cart mutation or a checkout attempt.

The demo declares the small `ModelContext` surface it uses, because the draft API is not in the DOM type definitions yet. The type marks `getTools()` and `executeTool()` as optional: a browser can register tools without exposing the in-page execution APIs, and the scripted scenario runner stays unavailable in that case. The two types are small enough to show in full:

```ts
export type WebTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    consequentialHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (
    input: unknown,
    options?: { signal?: AbortSignal },
  ) => Promise<string>;
};

export type ModelContext = {
  registerTool: (
    tool: WebTool,
    options: { signal: AbortSignal },
  ) => Promise<void> | void;
  getTools?: () => Promise<{ name: string }[]>;
  executeTool?: (tool: { name: string }, input: unknown) => Promise<unknown>;
};
```

## Schemas from Zod

The tool schemas are generated from the same Zod schemas that validate the UI and the server. There is no second handwritten catalog to drift. The tool helper calls `z.toJSONSchema(schema)`, which is built into Zod 4; there is no separate `zod-to-json-schema` package.

```ts
export const addToCartSchema = z.strictObject({
  productId: z
    .string()
    .min(1)
    .max(100)
    .describe("Product ID returned by search_products, for example mouse-air."),
  quantity: z
    .number()
    .int()
    .positive()
    .describe(
      "Units to add to the existing quantity. This is additive, so repeating the call adds again.",
    ),
});
```

`set_cart_quantity` extends the same shape and changes the meaning of `quantity`:

```ts
export const setCartQuantitySchema = addToCartSchema.extend({
  quantity: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Final quantity for this product, not an increment. Zero removes it. Repeating the same value keeps that quantity.",
    ),
});
```

Three things fall out of this.

The schema is strict. `z.strictObject` becomes `additionalProperties: false` in JSON Schema, so an unknown field is rejected rather than ignored. The error names the field paths and codes, and does not echo private values.

The descriptions carry the semantics the model needs: what the ID is, that amounts are cents, that `add_to_cart` is additive and `set_cart_quantity` is absolute, that zero removes a line. The code comment is not enough; the model never sees it. `search_products` says prices and `maxPriceCents` are EUR cents per unit, because a model that assumes euros will pass 50 for €50.00.

The same validation runs on both sides. The tool parses the input before calling the domain function. The checkout route parses the request again. The UI uses the same Zod schema through React Hook Form. A change to the rules lands in all three places at once.

Chrome's security guidance recommends descriptions under 500 characters and parameter descriptions under 150. The demo keeps them short and puts recovery information in the error, not in the description.

## Annotations, and what they do not enforce

Every tool starts with false hints and overrides what applies:

```ts
annotations: {
  readOnlyHint: false,
  consequentialHint: false,
  untrustedContentHint: false,
  ...hints,
},
```

The reads set `readOnlyHint: true`. `start_checkout` sets `consequentialHint: true`. No tool sets `untrustedContentHint`, because every result is shop-authored catalog or cart data; there is no user-generated text in the demo.

`start_checkout` is marked consequential even though it does not charge. It creates a Stripe session and returns the URL that leads to payment. That is the highest-stakes call in the surface, and a wrong one is worth a confirmation. The annotation is conservative on purpose.

The hints are advisory: a page can lie, and the browser or agent decides what to do with the hint. The demo does not rely on the annotation for safety. The server revalidates the cart, the stock, the prices, the origin and the Stripe key; the tool handler validates the input; and the UI shows the result. The annotation is a signal to a cooperative agent, not a security boundary.

The payment boundary is enforced by what the tools can do, not by what they say. `start_checkout` can create a Stripe session, but it cannot complete payment. The success route fetches the session from Stripe and verifies test mode, status, shop identity, currency and totals. A URL flag cannot establish payment. A cancelled or unpaid session keeps the cart. A verified payment clears only the cart whose signature matches, so changes made while Stripe was open are preserved.

## The human boundary

The checkout flow is split into two tool calls and one human step.

`prepare_checkout` validates the non-empty cart, returns the summary and signature, dispatches the review state and calls `router.push('/checkout')` from inside the tool handler. It does not create a session. The page shows the cart, the delivery choice and the total. Chrome returns `null` when a tool handler triggers a navigation, so the scenario runner accepts either the returned object or `null`. The demo does not treat the route change as cancellation; a pending call is cancelled through its execution signal, not by the route change.

`start_checkout` is the only tool that can create a payment session. It takes the same form the checkout page takes:

```ts
const form = checkoutFormSchema.parse(input);
const cart = bridge.getState().cart;
const totals = checkoutTotals(cart, form.shippingMethod);
const payload = JSON.stringify({ ...form, cart: cartSignature(cart) });
if (checkoutAttempt?.payload !== payload)
  checkoutAttempt = { payload, id: crypto.randomUUID() };
const requestCart = [...cart].sort((a, b) =>
  a.productId.localeCompare(b.productId),
);
const url = await createStripeSession(
  { ...form, cart: requestCart, attemptId: checkoutAttempt.id },
  signal,
);
return {
  url,
  totalCents: totals.totalCents,
  shippingCents: totals.shippingCents,
  requiresHumanPayment: true,
};
```

That object is the operation result, not the final tool return. The `tool()` helper wraps it in `{ ok: true, result }` and returns `JSON.stringify(...)`, which is why `WebTool.execute` is typed `Promise<string>` for every tool. `checkoutFormSchema` owns the form fields, including `acknowledgeDemo`, so the parse fails unless the caller sends `true`.

Across the snippets, `checkoutFormSchema`, `cartSignature` and `checkoutTotals` come from `lib/checkout.ts`, `DomainError` from `lib/domain.ts`, and `createStripeSession` is the local helper in `lib/webmcp.ts`.

The tool returns the URL but does not navigate, open a window or pay. The person opens the URL, enters the address and card on Stripe's hosted page, and completes the test payment. The schema has no card fields, and the page never sees card data.

The intended flow is `prepare_checkout` then `start_checkout`, but `start_checkout` is independently callable. The review step is a UX affordance, not a server-enforced precondition. The enforcement is the schema, the non-empty cart and the server, not a review flag. Payment still requires a human on Stripe.

The server route does the checks the browser cannot be trusted to do: origin, content type, body size, JSON, Zod, totals from the catalog, Stripe configuration and a test-mode session. It rejects live keys. The Stripe session carries the cart signature, the shipping method and the contact name as metadata, and the success route recomputes the total from that signature before it shows a receipt.

Idempotency is deliberately narrow: identical `start_checkout` requests in the same document reuse an attempt ID, so a timeout or a cancelled fetch can retry with the same server idempotency key. A reload starts a new attempt, and a changed cart or contact starts a different one. The demo does not claim cross-document payment deduplication. Aborting the fetch cannot undo a session that Stripe has already created; the same attempt ID lets a retry reuse it, but a reload does not.

<!-- SCREENSHOT 2: the checkout page after prepare_checkout, showing the human payment step. Suggested caption: "The agent stops at review; card details stay on Stripe." -->

## Errors the model can use

Every tool returns a JSON string with one of two envelopes:

```json
{ "ok": true, "result": { "totalCents": 10960 } }
```

```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 24 units of Air Wireless Keyboard are available.",
    "details": {
      "productId": "kb-air",
      "requestedQuantity": 25,
      "availableQuantity": 24,
      "recovery": "Set a quantity at or below availableQuantity, or search for another product."
    }
  }
}
```

The stock error is the clearest example. It gives the model the product, the requested quantity, the available quantity and a recovery instruction. The cart is unchanged. The model can correct the quantity or search for another product without guessing.

Invalid arguments return `INVALID_ARGUMENTS` with field paths and validation codes. The demo does not echo the supplied values, because an invalid extra field could contain private data. Cancellation returns `CANCELLED` and passes the execution signal into `fetch`. The message warns that a cancelled mutation may already have reached the server, so the model should read the cart before retrying.

The stable codes are `PRODUCT_NOT_FOUND`, `INVALID_QUANTITY`, `INVALID_ARGUMENTS`, `INSUFFICIENT_STOCK`, `INVALID_CART`, `EMPTY_CART`, `CANCELLED` and `CHECKOUT_FAILED`.

The retry semantics are part of the interface. `add_to_cart` is additive and must not be blindly replayed after an uncertain result. `set_cart_quantity` is absolute and safe to repeat for the same target. `clear_cart` is idempotent. This is why the tool descriptions say it explicitly, and why the error message says it again.

## The activity panel

The panel separates four facts that are easy to conflate:

- whether the browser exposes the API
- how many tools registered
- how many calls this document has seen
- what each call actually did

The `/demo` page shows the same status. A browser flag can make the API available; it does not prove that an agent is connected. A registration count of nine does not prove that anything called them. The panel says so in plain text.

Only a registered handler call creates an entry; ordinary shop clicks do not. The demo also has a "Build example cart through UI" button, explicitly labelled as a comparison; it does not log fake WebMCP calls.

The panel cannot identify the caller: an entry could come from an external agent, an inspector or one of the scripted scenarios. The integration does not receive a caller identity, so it does not label entries as verified agent calls.

The transcript is redacted before it reaches React state or `sessionStorage`. The allowlist covers the shop's own arguments only:

```ts
const allowed = new Set([
  "productId",
  "quantity",
  "query",
  "category",
  "connectivity",
  "maxPriceCents",
  "inStockOnly",
  "sort",
  "shippingMethod",
  "acknowledgeDemo",
]);
```

Name and email are not on the list, so contact details never enter the activity transcript even before the pattern redaction. The checkout request still sends them to the server and Stripe, because the session needs them. Unknown arguments are omitted, because an invalid field could contain anything. The redaction also catches emails, Stripe checkout URLs, Stripe session IDs and keys that appear inside an allowed field such as `query`.

```ts
.replace(/https?:\/\/checkout\.stripe\.com[^\s"<>]*/gi, "[Stripe checkout URL omitted]")
.replace(/cs_(?:test|live)_[A-Za-z0-9]+/g, "[session ID omitted]")
.replace(/[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
```

Up to 30 completed calls stay in this tab's `sessionStorage`. They survive a reload and a same-tab return from Stripe, but the current document's observed-call count starts at zero. Clearing activity removes the saved transcript. The demo treats the transcript as presentation evidence, not a secure audit log, because the user can edit browser storage.

The cart is separate: it lives in `localStorage`, is shared across tabs through the storage event, and is restored with validation, so bad lines are dropped, quantities are clamped to stock and duplicates are merged. The activity transcript is per tab; the cart is per browser profile.

The actual Stripe URL is returned only to the tool caller; the panel stores the redacted form.

## Three scenarios

The demo has three scripted conversations, and they are not an embedded AI assistant. Each button clears the cart and activity, then calls the browser's real `getTools()` and `executeTool()` APIs. A compatible external agent can follow the same prompts.

| Scenario | What happens | Result |
| --- | --- | --- |
| Equip two colleagues | Search keyboards and mice, add two of each, preview, prepare | €109.60 with free standard delivery |
| Recover from stock | Try 25 keyboards against stock 24, read the error, add two | €74.70 with standard delivery |
| Change your mind | Add four mice, set the quantity to two, preview | €44.70 with standard delivery |

The runner is not an agent, but it uses the same page-facing APIs. `getTools()` and `executeTool()` are part of the draft's `ModelContext` interface, so an in-page script can call them; the runner is demo code exercising that path, not a test-only browser feature.

The runner resolves each tool from the live list before it calls it:

```ts
const available = await context.getTools();
const tool = available.find((item) => item.name === name);
const result = await executeNativeTool(context, tool, input);
```

The stock scenario intentionally fails once. Success is the recovery, not the absence of an error. The shopping scenario stops at `prepare_checkout`; it does not create a Stripe session. The adjust scenario shows why `set_cart_quantity` exists next to `add_to_cart`.

The scripted calls are real: the scenario runner is a piece of demo code, not a model. That distinction is visible in the panel: an entry says "Success" or "Error", not "agent decided".

The UI comparison button builds the same two keyboards and two mice through the ordinary shop interface and produces the same €109.60 subtotal, but it does not add tool activity. It is there to make the difference visible.

<!-- SCREENSHOT 3: the WebMCP panel open with a completed add_to_cart call and redacted JSON. Suggested caption: "The panel records the actual handler call, not a simulated agent transcript." -->

## What we tested

The current repository has 54 Vitest tests, not a Playwright suite. (The October 6 verification record documents 48 from an earlier pass; the suite has grown since.) They cover catalog filtering, integer totals, stock, immutable quantity updates, safe persisted-cart loading, review invalidation, shipping boundaries, strict checkout input, Stripe session construction, metadata size limits, idempotency, payment verification and matching-cart clearing.

The WebMCP tests cover:

- nine strict tools, with `additionalProperties: false`
- no `confirm_payment`
- correct safety hints, including `consequentialHint` only on `start_checkout`
- sequential calls against the latest shared state
- explicit errors that do not corrupt the cart
- abort-scoped registration
- current object arguments and older JSON-text arguments without double mutations

The unit tests use a test double for `document.modelContext`. That is useful for the tool logic, but it cannot prove the browser exposes the API. The browser pass is the check for that.

The browser verification record covers native discovery and execution in the Codex in-app browser, the stock error, express delivery, desktop and 390 px layouts, reload persistence, the cancelled checkout return and an unverified payment that keeps the cart. The native scenario button completed seven successful calls and opened checkout with four items and a €109.60 total. No warning or error console messages were captured in the final production inspection.

Two limits are worth stating. The browser pass in `docs/verification.md` found six tools at the time; the current registry has nine, and the newer tools are covered by the unit tests and the scripted scenarios rather than a repeated browser pass. And the recorded verification did not have a Stripe test key, so it did not exercise a hosted Stripe session, a card payment or a signed webhook. The code validates that path; the live checkout depends on the deployment's Stripe configuration.

HTTP checks cover a missing Stripe key (503), an untrusted origin (403) and a client-supplied total or above-stock quantity (400).

## What the demo leaves out

- Authentication. The cart is anonymous, and there is no user account.
- A database. Product stock is fixed seed data; there is no reservation, so the demo does not model oversell.
- Real payments. Stripe runs in test mode; no money moves and nothing ships.
- Cross-document idempotency. Attempt IDs reset on reload; only same-document retries reuse them.
- A background agent. Tools exist only while the page is open.
- Declarative forms. The demo uses the imperative API only.
- A polyfill. The shop works without WebMCP, but the tools require a browser or agent that implements the API.
- Agent identity. The page cannot tell an external agent from an inspector or a script.
- Cross-origin tools. The shop is top-level; an iframe would need `allow="tools"` and the tool owner would need `exposedTo`.
- A tool budget strategy. Nine tools is already a meaningful context cost; a larger shop would register per route or per workflow.

Some of these are deliberate scope choices, and some are limits of the proposal. Tools do not survive a closed tab. A site cannot restrict its tools to one agent vendor, only to origins. There is no standard way to ask a site what it offers before visiting it. Service workers are still an explainer, not a shipped feature.

## When WebMCP is the right tool

Use WebMCP when the agent is working in the user's tab, with the user's session, and the page is the product. That is the demo's case: a shop, a cart and a checkout that already exist.

Use an MCP server when the agent must work without a browser, from a different client, or while the user is away. The server owns the credentials and the lifetime; the tool can run at 3 a.m.

Use computer use when the site cannot be changed. Anthropic's current computer-use toolset has 17 member tools, and each screenshot costs roughly 1,000–1,800 input tokens. It works on sites that register nothing, but every step is a model round trip. WebMCP is one typed call for the same action. The two are complementary: an agent should try `getTools()` first and fall back to the screen when the list is empty.

Gmail is the counterexample. Google has not registered WebMCP tools for Gmail or any other Workspace app; it went the server route with a Workspace MCP server in May 2026. A browser agent cannot ask Gmail for tools Gmail never wrote, and no browser setting changes that. A browser extension could inject tools into a page it does not own, but that is not the site opting in.

SaaS tools are the better fit: a signed-in user, a rich UI, state on the client, the browser as the primary interface. Register the few operations the product already supports. The server keeps enforcing who may do what.

Declarative WebMCP is the Chrome experiment that turns an HTML `<form>` into a tool through attributes such as `toolname` and `tooldescription`; the browser derives the input schema from the form fields. It is useful for legacy forms, but it is not part of the current spec. The demo stays imperative because the cart and checkout are stateful.

Many sites will end up with both MCP and WebMCP, sharing the same business logic. That is the healthy outcome. WebMCP is not a replacement for the API; it is a browser-shaped door into it.

## What is not settled

WebMCP is still a draft. The entry point has changed names, `executeTool()` has changed its argument shape, and the declarative API is not in the spec. A tutorial from early 2026 may be wrong in more than one place.

Prompt injection is the risk the spec names first. A tool description is text the model reads and trusts, and so is a tool result. `untrustedContentHint` tells the agent to be careful; it does not make the agent careful. Confirmation is the browser's job, and the details are left to each implementation.

The agent is whoever the browser says it is. Today that means an extension in Chrome, ChatGPT's own desktop browser, and Gemini in Chrome promised to follow. A site cannot restrict its tools to one agent vendor, only to origins.

The incentive question is real. A shop gains when an agent can prepare checkout in a few calls instead of twenty clicks. The same shop may not love a tool that lets an agent compare its prices in one pass. The tools a site registers say a lot about what it wants agents to do.

## Sources

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/), [explainer](https://github.com/webmachinelearning/webmcp) and [implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md)
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), [declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api) and [tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Intent to Experiment, blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8)
- [Chrome early preview](https://developer.chrome.com/blog/webmcp-epp), [origin trial announcement](https://developer.chrome.com/blog/ai-webmcp-origin-trial), [Edge developer blog](https://blogs.windows.com/msedgedev/2026/09/21/new-in-edge-for-developers-create-better-components-and-make-your-site-agent-ready/) and [Search Engine Journal on ChatGPT](https://www.searchenginejournal.com/chatgpt-adds-webmcp-support/587237/)
- [ModelPiper on the API migration](https://modelpiper.com/blog/webmcp-chrome-api-migration-mocked-tests) (secondary: Chrome 150 alias, Chrome 153 removal)
- [ChatGPT site tools](https://learn.chatgpt.com/docs/webmcp)
- [Shopify storefront changelog](https://shopify.dev/changelog/webmcp-liquid-hydrogen) and [checkout changelog](https://shopify.dev/changelog/posts/webmcp-support-for-checkout)
- [Liip's ZüriCityGPT deployment](https://www.liip.ch/de/blog/webmcp-making-liipgpt-tools-discoverable-by-browser-ai-agents)
- [Mozilla standards position](https://github.com/mozilla/standards-positions/issues/1412) and [WebKit standards position](https://github.com/WebKit/standards-positions/issues/670)
- [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Zod JSON Schema conversion](https://zod.dev/json-schema)
- [Arcade interview with Alex Nahas](https://www.arcade.dev/blog/web-mcp-alex-nahas-interview/) and the [MCP-B repository](https://github.com/MiguelsPizza/WebMCP)
- [Anthropic computer use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- [Google Workspace MCP server, May 2026](https://workspaceupdates.googleblog.com/2026/05/agent-tools-and-security-updates-for-workspace-developers.html)
- [Office Supply demo](https://web-mcp-app.vercel.app/) and [repository](https://github.com/preska-elixirr/web-mcp-app), including `docs/verification.md` and `docs/webmcp-demo.md`
