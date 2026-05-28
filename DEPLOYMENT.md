# QuoteQuick - Vercel Deployment Guide

This guide walks you through deploying QuoteQuick to production on Vercel.

## Prerequisites

- A Vercel account (free tier is sufficient)
- A Supabase project (free tier works great)
- A Stripe account (for subscriptions and the upgrade flow)

---

## Step-by-Step Deployment

### 1. Prepare Your Supabase Project

1. Make sure you have run all migrations in `supabase/migrations/`
2. In Supabase Dashboard → **Authentication → URL Configuration**, add your future production URL under:
   - **Site URL**: `https://quotequick.uk`
   - **Redirect URLs**: Add `https://quotequick.uk/**`
3. Go to **Project Settings → API** and note down:
   - Project URL
   - `anon` / `public` key
   - `service_role` key (keep this secret!)

### 2. Prepare Your Stripe Account

1. Create two **monthly recurring** products:
   - **Pro** — £12/month
   - **Premium** — £19/month
2. Copy the **Price IDs** (they start with `price_...`)
3. Go to **Developers → Webhooks** and create a new endpoint:
   - URL: `https://quotequick.uk/api/stripe/webhook` (you can update this after deployment if needed)
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. After creating the webhook, copy the **Signing secret** (`whsec_...`)

### 3. Deploy to Vercel

#### Option A: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Vercel will auto-detect Next.js — click **Deploy**

#### Option B: Deploy with Vercel CLI

```bash
npm i -g vercel
vercel
```

### 4. Configure Environment Variables in Vercel

After the first deployment (it will fail without env vars), go to:

**Vercel Dashboard → Your Project → Settings → Environment Variables**

Add the following variables:

| Name                            | Value                                      | Environment     | Notes |
|--------------------------------|--------------------------------------------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL`     | `https://xxx.supabase.co`                  | Production + Preview | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Your Supabase anon key                     | Production + Preview | Required |
| `SUPABASE_SERVICE_ROLE_KEY`    | Your Supabase service_role key             | Production + Preview | **Server only** - keep secret |
| `STRIPE_SECRET_KEY`            | `sk_live_...` or `sk_test_...`             | Production + Preview | Required for billing |
| `STRIPE_WEBHOOK_SECRET`        | `whsec_...`                                | Production + Preview | From Stripe webhook |
| `STRIPE_PRO_PRICE_ID`          | `price_...`                                | Production + Preview | From Stripe |
| `STRIPE_PREMIUM_PRICE_ID`      | `price_...`                                | Production + Preview | From Stripe |
| `NEXT_PUBLIC_SITE_URL`         | `https://quotequick.uk`                    | Production       | **Critical** for Stripe redirects |

> **Important**: Set `NEXT_PUBLIC_SITE_URL` to your actual Vercel domain (e.g. `https://quotequick-abc123.vercel.app`).

After adding the variables, redeploy the project.

### 5. Configure Stripe Webhook (Production)

Once your app is live:

1. Go back to Stripe Dashboard → Webhooks
2. Update your webhook endpoint to the real production URL:
   ```
   https://quotequick.uk/api/stripe/webhook
   ```
3. Make sure the same events are selected.

### 6. Update Supabase Auth URLs

In Supabase Dashboard → **Authentication → URL Configuration**, update:

- **Site URL**: `https://quotequick.uk`
- Add `https://quotequick.uk/**` to **Redirect URLs**

### 7. Test the Deployment

After deployment, verify the following:

- [ ] Landing page loads (`/`)
- [ ] Can sign up and log in
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Can create a quote and download PDF
- [ ] Can create customers
- [ ] Settings page shows current plan
- [ ] Upgrade flow works (if you have Stripe configured)
- [ ] Invoices can be created and downloaded
- [ ] Health check returns 200 at `/api/health`

---

## Environment Variables Reference

See [.env.example](.env.example) for a fully commented template.

**Minimum required to run the app:**
- All Supabase variables
- `NEXT_PUBLIC_SITE_URL`

**Required for full functionality (subscriptions):**
- All Stripe variables

---

## Common Issues & Fixes

### "Invalid API key" or auth not working
→ Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct and match your Supabase project.

### Stripe checkout redirects to wrong URL
→ `NEXT_PUBLIC_SITE_URL` must be set to your **exact** production domain (including `https://` and no trailing slash).

### Webhook not receiving events / 401 errors
→ Make sure `STRIPE_WEBHOOK_SECRET` matches the signing secret from the webhook you created in Stripe.

### Service role key errors in webhook
→ The `SUPABASE_SERVICE_ROLE_KEY` must be set (this is the only place it is used).

### Images / assets not loading
→ Make sure you redeployed after adding all environment variables.

---

## Post-Deployment Recommendations

### Connecting the Custom Domain quotequick.uk

After your app is successfully deployed and tested on the default Vercel domain, connect your custom domain:

1. In Vercel, go to **Settings → Domains** and add `quotequick.uk`.
2. Vercel will display the required DNS records (usually an A record to `76.76.21.21`).
3. At your domain registrar (or Cloudflare), add the DNS records for both the apex (`@`) and `www` (if desired).
4. Wait for DNS propagation (usually 5–30 minutes).
5. Vercel will automatically issue a free SSL certificate.
6. Update the following:
   - In Vercel Environment Variables: set `NEXT_PUBLIC_SITE_URL` to `https://quotequick.uk` and redeploy.
   - In Supabase → Authentication → URL Configuration: set Site URL to `https://quotequick.uk` and add `https://quotequick.uk/**` to Redirect URLs.
   - In Stripe → Webhooks: update the endpoint to `https://quotequick.uk/api/stripe/webhook`.

**Recommended**: Use Cloudflare for DNS management for faster propagation.

### Health Check

A minimal health check endpoint is available at `https://quotequick.uk/api/health`. It returns `{ "status": "ok" }`. Use this for monitoring and uptime checks.

---

## Need Help?

- Check the in-app Settings page for current plan status
- Stripe test mode works perfectly during development
- The webhook route is resilient — failed events can be retried from the Stripe dashboard

**You're ready to ship.** Good luck!
