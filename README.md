# Office Supply — Next.js shop & WebMCP demo

A complete fictional shopping flow with generated product photography, dedicated product pages, a persistent cart, checkout form and Stripe **test-only** hosted payments. People and native WebMCP tools share the same validated catalog and cart operations.

## Start locally

Use Node.js 24+ (tested with 24.19.0) and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Browsing, cart operations and WebMCP do not need credentials. Stripe payment requires your own test account and server key; see [Stripe setup](docs/stripe-setup.md). Copy `.env.example` to `.env.local`, replace the placeholder with `STRIPE_SECRET_KEY=sk_test_...`, set `APP_URL` to the exact public origin and restart the server. Never commit `.env.local` or send the key in chat.

Without a key, checkout displays its configuration status and disables payment. It never fabricates a successful Stripe payment. Live keys are rejected.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Photographic homepage, categories and featured products |
| `/shop` | All 24 products; query, category, connection, unit-price, stock and sort controls |
| `/products/[slug]` | Individual product, image enlargement, specifications, stock, quantity and related products |
| `/cart` | Product photographs, quantity changes, removal, shipping estimate and totals |
| `/checkout` | React Hook Form + Zod contact, delivery and order review |
| `/checkout/success` | Server-verified Stripe test receipt or pending/unverified state |
| `/help`, `/about` | Demo delivery, payment, privacy and shop information |
| `/demo` | Native WebMCP support, repeatable scenario, tool activity and reset |
| `/api/checkout` | Validated server creation of a Stripe test Checkout Session |
| `/api/stripe/webhook` | Optional signed test-webhook verification |

## Structure

```text
app/                       Next.js App Router pages, route handlers and layouts
components/                Shop features, persistent provider and WebMCP integration
  ui/                      Official shadcn/ui components (Base UI, base-nova)
lib/                       Catalog, Zod schemas, domain, checkout and Stripe helpers
public/products/           24 individually generated product photographs
public/images/             Generated workspace hero photograph
tests/                     Domain, persistence, checkout/payment and WebMCP tests
docs/                      Stripe setup, verification record, image prompts and versions
```

Root `app/` is an official Next.js structure; `src/` is optional. shadcn components live in `components/ui/`. The initial installation used the [official manual installation](https://nextjs.org/docs/app/getting-started/installation#manual-installation) to preserve the existing repository and plan. Next.js generates `AGENTS.md` and `CLAUDE.md` during development to point coding agents at its bundled documentation.

## Verified stable dependencies

The direct dependency `latest` tags were verified online on October 6, 2026 and pinned exactly. Full records: [dependency-versions.json](docs/dependency-versions.json).

| Dependency | Version |
| --- | --- |
| Next.js | 16.3.8 |
| React / React DOM | 19.3.0 |
| TypeScript | 7.0.2 |
| Tailwind CSS / PostCSS | 4.3.3 |
| shadcn / Base UI | 4.21.3 / 1.8.0 |
| Zod | 4.6.5 |
| React Hook Form / resolvers | 7.89.0 / 5.9.1 |
| Stripe Node SDK | 23.0.0 |
| Biome / Vitest | 2.5.15 / 5.0.3 |

Biome provides formatting and linting with the latest TypeScript, avoiding the incompatible peer ranges in the current ESLint plugins. The lockfile was created with the bundled pnpm 11.19.0.

## Checkout behavior

Amounts are integer EUR cents. The server reloads prices and stock from the catalog; the client cannot supply payable amounts. Standard delivery is €4.90, free at a €100 product subtotal. Express is €9.90. Address and card collection take place on Stripe's hosted page. No additional tax is applied in this fictional demo.

Idempotency keys deduplicate identical checkout retries. Return URLs use the configured app origin. The success route fetches the session from Stripe and verifies test mode, paid/completed status, shop identity, currency and expected totals. URL flags cannot establish payment. A cancelled, unpaid or invalid session keeps the cart. A verified payment clears only the matching cart, preserving changes made while Stripe was open.

Test orders are retained in Stripe's test dashboard. Stock is fixed seed data; this demo has no database, stock reservation, authentication, real fulfillment or legal production shop policies. The optional signed webhook acknowledges verified test events without inventing fulfillment or database writes.

## Native WebMCP

The browser also keeps a bounded list of completed test session IDs to prevent revisiting an old receipt from clearing a newly rebuilt identical cart. No contact or address details are stored in browser storage.

The persistent root integration registers seven tools using the current `document.modelContext.registerTool()` API and abort-scoped cleanup. It feature-detects browser support and keeps the ordinary shop working when support is absent.

- `search_products`, `get_product_details`, `get_cart`: read-only catalog/cart operations.
- `add_to_cart`: additive positive integer quantities.
- `set_cart_quantity`: absolute quantities; zero removes.
- `prepare_checkout`: validates the cart and opens human review. It does not create payment sessions or submit payment.
- `start_checkout`: takes name, email, delivery method and the demo acknowledgement, creates a Stripe test session through the same `/api/checkout` route and returns its URL with totals. It does not open the URL or submit payment; a human pays on Stripe's hosted page.

Zod generates strict JSON schemas. Calls return structured JSON success or explicit domain errors and are shown in `/demo`. Mutations update and persist the current shared state before returning, so sequential calls see the latest cart. Native tool calls use synchronous React commits; ordinary UI updates use view transitions.

The repeatable scenario is 2 × `kb-air` plus 2 × `mouse-air`: **€109.60**, including free standard delivery, within the €180 budget. `/demo` has separate buttons for a normal UI example and execution through the actual native WebMCP API. No polyfill is used.

See [Chrome's official browser setup](https://developer.chrome.com/docs/ai/webmcp) and [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api). Local Chrome setup uses `chrome://flags/#enable-webmcp-testing`; a public site can require an origin trial or compatible browser setup.

## View Transition API & images

Stable React `<ViewTransition>` coordinates native view transitions for route changes, product photo morphs, deferred search results, filters and cart changes. Next.js App Router enables route transitions without an experimental configuration flag. Full document loads use ordinary navigation, avoiding overlap between browser cross-document transitions and React's first client transition. Unsupported browsers render ordinary updates; reduced-motion preferences disable animation.

Page backgrounds use independent opacity-only exit/enter snapshots, so changing scroll positions does not morph the whole page. Browser Back/Forward use a feature-detected Navigation API adapter: the browser retains its history entries, Next renders through `router.replace()`, and saved scroll positions are restored in the React layout phase before snapshot measurement. Legacy `popstate` intentionally skips React animations; see [React's router guidance](https://react.dev/reference/react/ViewTransition#building-view-transition-enabled-routers). Browsers without interception support keep standard history navigation. Development console messages prefixed `[view-transition]` expose actual browser snapshot keyframes; production builds do not log them.

All 25 raster images were created with built-in imagegen for this project, copied into `public/`, and served by `next/image` with responsive sizes and lazy loading. The homepage and product hero are preloaded. Prompts are recorded in [image-prompts.json](docs/image-prompts.json). Images illustrate fictional products.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` runs all four; `pnpm format` applies safe fixes. See [verification.md](docs/verification.md) for checks performed and concrete limitations. Stripe payment and authenticated webhook delivery require a test account/key and have not been exercised against Stripe yet. Deployment and article materials remain separate milestones in [PLAN.md](PLAN.md).
