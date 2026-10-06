# Stripe test setup

The complete shop works locally without Stripe credentials. To exercise hosted test payment:

1. Create or sign in to your own [Stripe account](https://dashboard.stripe.com/register). Use a sandbox/test environment; see [Stripe sandboxes](https://docs.stripe.com/sandboxes).
2. Open the API keys page for that test environment and copy its secret key beginning `sk_test_`. Keep it private. This hosted integration does not need a browser publishable key.
3. Copy `.env.example` to `.env.local` in the repository and replace the placeholder:

   ```dotenv
   STRIPE_SECRET_KEY=sk_test_your_private_test_key
   APP_URL=http://localhost:3000
   ```

4. Restart Next.js. Open the app on the exact `APP_URL` origin so your browser cart and Stripe return page use the same local storage.
5. Add products, open `/checkout`, enter fictional name/email, select delivery and acknowledge the test order. Continue to Stripe.
6. Enter a fictional address in Croatia, Slovenia, Germany, Austria or Italy. Use test card `4242 4242 4242 4242`, a future expiry and any three-digit CVC. See [official test cards](https://docs.stripe.com/testing).
7. After completing test payment, Stripe returns to the verified receipt. Inspect the Checkout Session/payment in your Stripe test dashboard.

For failure testing, use the decline cards in Stripe's testing guide. Cancel checkout to verify the saved cart. Opening the success URL without a valid paid session must never show a confirmed order.

## Optional signed webhook

The demo can verify signed test events at `POST /api/stripe/webhook`. It does not need a webhook to show a server-verified receipt, and it does not perform real fulfillment.

With the [official Stripe CLI](https://docs.stripe.com/stripe-cli), authenticate your own account and forward events:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the displayed signing secret into `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...` and restart Next.js. Complete a test checkout from this app. The webhook verifies the raw request signature and rejects live events. Webhook events created by generic CLI fixtures have no shop metadata and are acknowledged without an order side effect.

## Hosting

For a public deployment set `APP_URL` to its exact HTTPS origin and configure `STRIPE_SECRET_KEY` as a private server environment variable. Add a test webhook endpoint and its signing secret if webhook testing is needed. This application intentionally rejects live secret keys.

Orders, customer contact details and addresses supplied to Checkout are held in the Stripe test environment. The app stores product IDs and quantities in the browser cart, plus the last 50 completed test session IDs to avoid clearing a new cart when revisiting an old receipt. It does not persist contact details, addresses or card details in browser storage. Do not use real personal or payment details in this fictional shop.
