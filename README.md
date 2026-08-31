# Token Ledger

A multi-tenant AI token spend tracker: connect your own Anthropic/OpenAI
API keys, see a cached dashboard of spend, get forecasts, run a
"switch model" savings simulator, and ask a tool-using agent about your
spend. A synthetic AWS Bedrock connector demonstrates extending the
pattern to a provider not covered by the inspiration for this project
(Ramp's AI Token Spend Management).

See [`ramp-project-implementation-phases.md`](./ramp-project-implementation-phases.md)
for the full phased build plan and [`docs/architecture.md`](./docs/architecture.md)
for the fixed Phase 0 decisions this build follows.

## Stack

Next.js (App Router) + Supabase (Auth, Postgres, Vault) + Recharts +
Vercel + a Python serverless function for forecasting + Claude API (tool
use) for the agent features.

## Setup

1. Use Node 22 (`.nvmrc` pins this — `nvm use` if you have nvm).
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
     `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's
     Settings → API page.
   - `ANTHROPIC_API_KEY` from console.anthropic.com — this powers the
     agent features server-side; end users never provide this.
4. Run `supabase/schema.sql` in the Supabase SQL editor to create the
   tables and RLS policies.
5. `npm run dev` and visit `/api/health` to confirm the app can reach
   Supabase.

## Deploy

Push to GitHub, import the repo in Vercel, and mirror the same
environment variables in the Vercel project settings.
