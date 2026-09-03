# Token Ledger

A multi-tenant AI token spend tracker: connect your own Anthropic/OpenAI
API keys, see a cached dashboard of spend, get forecasts, run a
"switch model" savings simulator, and ask a tool-using agent about your
spend. Inspired by Ramp's AI Token Spend Management.

See [`docs/ramp-project-implementation-phases.md`](./docs/ramp-project-implementation-phases.md)
for the full phased build plan and [`docs/architecture.md`](./docs/architecture.md)
for the fixed Phase 0 decisions this build follows.

## Stack

Next.js (App Router) + Supabase (Auth, Postgres, Vault) + Recharts +
Vercel + a Python serverless function for forecasting + Claude API (tool
use) for the agent features.

## Setup

1. Use Node 22 (`.nvmrc` pins this; run `nvm use` if you have nvm).
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
     `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's
     Settings → API page.
   - `ANTHROPIC_API_KEY` from console.anthropic.com: this powers the
     agent features server-side; end users never provide this.
4. Run `supabase/schema.sql`, then `supabase/vault_functions.sql`, then
   `supabase/rate_limit_functions.sql`, in the Supabase SQL editor: the
   tables/RLS policies, the Vault wrapper functions used to encrypt
   connected provider keys, and the rate-limit counter used to cap
   key-validation, sync, and agent requests.
5. `npm run dev` and visit `/api/health` to confirm the app can reach
   Supabase.

## Connecting a provider

`/dashboard/connections` lets a signed-in user add a provider key and click
"Sync now" to backfill `usage_records`. Anthropic and OpenAI both require an
**org/Admin-level API key** for usage-reporting access, not a regular
per-project key. The connect form validates against each provider's usage
endpoint and will reject a regular key with a message saying so.

The real Anthropic/OpenAI ingestion code
(`src/lib/ingestion/{anthropic,openai}.ts`) is built against each
provider's documented usage-API response shape but hasn't been exercised
against a live Admin key; if a real sync ever fails or looks wrong, the
thrown error includes the raw response body to make the field-mapping fix
easy.

## Demo account

`npm run seed:demo` creates (or reuses) a shared demo account and seeds it
with synthetic Anthropic and OpenAI usage, so a visitor can sign in
without connecting a real key. It uses two demo-only generators
(`anthropic-synthetic.ts`, `openai-synthetic.ts`, built on the shared
random-walk machinery in `synthetic.ts`) that are never imported by the
app's real connect-a-provider flow, only by `scripts/seed-demo-account.ts`.
Safe to re-run: it reuses the existing user/connections and upserts usage
records instead of duplicating them.

Credentials are set at the top of `scripts/seed-demo-account.ts` and
deliberately **not** published here or on the landing page: the demo
account's agent features (briefing/chat/anomaly-explain) call the
developer's own `ANTHROPIC_API_KEY`, so a publicly-known login is a real
cost risk, not just a data-tampering one, even with rate limiting in
place. Share the credentials directly with whoever should have demo
access instead of posting them anywhere public.

## Deploy

Push to GitHub, import the repo in Vercel, and mirror the same
environment variables in the Vercel project settings.
