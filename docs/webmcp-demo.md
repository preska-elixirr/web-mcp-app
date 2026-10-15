# WebMCP presentation demo

The demo is designed to accompany the article: a person and an agent operate the same cart, while a visible record shows which native tools actually ran.

## Present the demo

1. Open `/demo` in a browser with WebMCP enabled. Browser API availability, registration and observed calls are separate signals. A browser flag alone does not establish that an external agent can call tools.
2. Open the **WebMCP** panel in the lower corner. It remains available on shop routes, so viewers can follow the arguments, result and time of each handler call.
3. Give a compatible agent one of the displayed prompts, or run an explicitly labelled scripted in-page scenario. The script uses native APIs but is not an AI assistant. Caller identity is not supplied by this integration.
4. Expand a call to inspect its redacted JSON. Copy the transcript for the article. The last 30 completed calls stay in this tab's session storage across reloads and a same-tab Stripe round trip. The current document's observed-call count starts at zero after reload.

## Scenarios

| Conversation | Calls of interest | Expected result |
| --- | --- | --- |
| Equip two colleagues | Search → details → add → summary → prepare | Two keyboards and two mice; €109.60 with standard delivery |
| Recover from stock limit | Details → excessive add → read cart → corrected add → summary | One expected stock error; two keyboards, €74.70 with standard delivery |
| Change your mind | Add four mice → set quantity to two → read → summary | Two mice; €44.70 with standard delivery |

The stock scenario intentionally includes an error. It is successful only when the stock error is recognized and the corrected cart is produced. Every scenario clears the existing cart and history first; its button says so. The UI comparison is explicitly separate and never fabricates tool calls.

## Tool surface

The live definitions, count, parameter descriptions and annotations come from `createShopTools` rather than a second handwritten catalog.

- Read: `search_products`, `get_product_details`, `get_cart`, `get_checkout_summary`.
- Cart: `add_to_cart`, `set_cart_quantity`, `clear_cart`.
- Review: `prepare_checkout` opens the shop checkout.
- Payment handoff: `start_checkout` returns a Stripe test URL using customer-authorized contact details. Card collection and final payment remain on Stripe.

`get_checkout_summary` requires `shippingMethod` (`standard` or `express`) so delivery costs are explicit. All monetary amounts are integer EUR cents. No session is created by the preview.

## Errors, retries and privacy

Stock errors expose `productId`, `requestedQuantity`, `availableQuantity` and a recovery suggestion. Invalid argument errors list field paths and validation codes without echoing private supplied values. Cancelled network operations are recorded as cancelled and propagate the execution signal.

Identical `start_checkout` requests reuse the same attempt ID in this document, even after a failed or cancelled request. The server continues to validate contact, origin, stock and totals, rejects live keys, and applies Stripe idempotency. A reload starts a new attempt. Aborting a request cannot undo a session that Stripe has already created. Additive cart mutations must not be blindly retried after an uncertain result.

The activity recorder omits contact-name and email fields and unknown arguments, and redacts email patterns, Stripe checkout URLs and session identifiers before they enter UI state or session storage. The actual Stripe URL is returned only to the tool caller. The transcript is presentation evidence, not a secure audit log; users can edit their own browser storage. A script or inspector can invoke tools too, so the panel does not label entries as verified external-agent calls.

## Scope of this change

Implemented on `main`. This change does not claim new Stripe end-to-end verification, browser compatibility results or test execution. Publishing the updated site requires a deployment of this source.

Static checks: `tsc --noEmit`, `biome check .` and `git diff --check` passed. `next build --webpack` completed successfully outside the sandbox. The default Turbopack build failed when its auxiliary Node process exited before connecting; the same failure occurred outside the sandbox. The bundler configuration was not changed.
