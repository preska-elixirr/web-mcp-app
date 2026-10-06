# Verification record

Checked on October 6, 2026.

## Automated checks

- Biome formatting/lint and strict TypeScript.
- 48 Vitest tests across catalog filtering, integer totals, stock, immutable quantity updates, safe persisted-cart loading, review invalidation, shipping boundaries, strict checkout input, Stripe session construction, metadata size limits, idempotency, payment verification, matching-cart clearing and history navigation.
- WebMCP tests cover strict schemas, hints, sequential shared state, explicit errors, human-only payment boundary and abort-scoped registration. These unit tests use a test double; browser verification below uses native tools.
- Next.js production build creates all 24 product routes.
- History tests cover restoration at commit, separate repeated entries, Next's internal same-destination replacement, intercepted traversal completion, listener cleanup, cross-document/hash exclusions and unsupported browsers.
- Native execution compatibility covers current object arguments and legacy JSON-string arguments. A tool execution error is never retried as a compatibility fallback.
- HTTP checks: valid input without a configured Stripe key returns 503; an untrusted origin returns 403; a client-supplied total or quantity above stock returns 400.

## Browser verification

- Native WebMCP discovery found all six tools in the Codex in-app browser. All six were executed: search, details, additive mutations, absolute quantity, current cart and checkout preparation. Sequential calls returned the expected €109.60 subtotal and updated the visible shared cart.
- Requesting 25 keyboards against stock 24 returned `INSUFFICIENT_STOCK` without changing the cart.
- Checkout contact validation reports a short name and invalid email on blur. Express delivery changes €109.60 to €119.50.
- Dedicated shop/product/cart/checkout navigation, product photographs, image enlargement, quantity controls and reload persistence.
- Desktop and 390px mobile inspection.
- The native scenario button completed seven successful calls and opened checkout with four items and a €109.60 total in the production build.
- The cancelled checkout return and an unverified payment confirmation both preserve the cart. The latter never presents a successful order.
- No warning or error console messages were captured in the final production browser inspection.
- Development browser inspection of actual React transition callbacks and native animation keyframes confirms a shared `product-photo-acc-light` geometry animation on Back. Page background snapshots animate opacity only. Saved scroll was restored to 1008.8px, with the selected card at the same 221.4px viewport position; Forward remains usable.
- The expanded catalog also returns to `product-photo-acc-organizer` on Back at 3641.6px scroll, with the card at 213.8px in the viewport and the destination heading focused without changing scroll. Inspection confirms both photo snapshots and opacity-only background animations.

## Limitations

- The user does not yet have a Stripe test account/key. No hosted Stripe session, card payment or signed webhook delivery has been performed against Stripe. The unconfigured checkout is intentionally disabled. Unit tests validate the payment logic independently.
- Reduced-motion CSS is implemented; reduced-motion browser emulation and Safari/Firefox animation playback were not exercised.
- The final build passes after removing cross-document animation opt-in. Restarting the final production preview was blocked because automatic approval review could not complete after reaching the account usage limit; final production browser playback after that CSS change remains unverified.
- No Vercel deployment, database, real stock reservations or fulfillment. Prices, inventory and delivery rules are fictional fixed demo data.
