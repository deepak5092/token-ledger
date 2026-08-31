# AI Token Spend Tracker (Ramp-Inspired) — Implementation Phases

**Goal:** A multi-tenant web app where any user can sign up, securely connect their own Anthropic/OpenAI API keys, see a dashboard of their AI token spend (cached, not fetched live on every page load), get spend forecasts, run a "switch model" savings simulator, and interact with a tool-using agent that investigates and explains their spend. A synthetic AWS Bedrock connector demonstrates extending the pattern to a provider Ramp doesn't currently support.

**Stack:** Next.js (App Router) + Supabase (Auth, Postgres, Vault for encrypted key storage) + Recharts + Vercel hosting + Claude API (tool use) for the agent features.

**Outreach context:** built in response to a LinkedIn post from Yicheng (Richard) Wang, Software Engineer on Ramp's Enterprise Product team, about their AI Token Spend Management integrations service.

---

## Phase 0 — Discovery & Planning (do this first, with Claude Code)

Before scaffolding anything, lock in these decisions so the architecture and data model don't need to change mid-build:

**Architecture / tech stack**
- Next.js API routes/Route Handlers for backend logic, or a separate small FastAPI service for the ingestion + forecasting pieces (Python has better time-series libraries via `statsmodels`)? Decide the split now: e.g. Next.js for everything except forecasting, which calls out to a tiny Python serverless function
- Supabase project region and whether you're using the Supabase JS client directly from the frontend (with Row Level Security) or funneling everything through your own API routes
- Confirm Supabase Vault is available on the free tier for your project, or whether `pgsodium`/`pgcrypto` column-level encryption is the fallback

**Data model**
- Exact `usage_records` schema: which fields are mandatory (date, provider, model, input_tokens, output_tokens, cost) vs optional (project tag, request count, cache-hit tokens)?
- How do you represent "cost" when a provider gives usage but not cost directly — store a pricing lookup table per model, updated manually, or trust the provider's own cost field when available?
- One `api_connections` row per provider per user, or allow multiple keys per provider (e.g. two separate OpenAI projects)?

**User flow**
- Auth method: email/password, magic link, or GitHub OAuth (GitHub OAuth is a nice touch given the portfolio also uses GitHub)?
- Onboarding order: force a provider connection before showing any dashboard, or let users explore a demo/synthetic view first and connect later?
- Manual "Sync now" button only for this weekend, or is a scheduled Vercel Cron / `pg_cron` refresh in scope too?
- Do you want a public demo mode (pre-loaded synthetic data, no signup) so you can link it in outreach without asking Richard to create an account and paste a real key?

**Security / trust**
- Confirm: keys go into Supabase Vault, decrypted only inside a server-side function at sync time, never sent back to the client
- What's the disclaimer copy for the landing/onboarding page about this being a demo project, not security-audited, and recommending a scoped/rotatable key?
- Rate limiting on the key-validation endpoint, to avoid it being abused as a free API-key-checking service

**Agent scope**
- Which of the three agent features (weekly briefing, anomaly explainer, ad hoc Q&A chat) are must-have for the weekend vs stretch goals?
- Whose Claude API key powers the agent calls — your own, with a usage cap, since this is a demo, not the end user's?

**Output of this phase:** a written schema (even just a `schema.sql` draft) and a one-paragraph user flow description, so every later phase is building against a fixed target.

---

## Phase 1 — Project Scaffolding

- `npx create-next-app@latest` (TypeScript, Tailwind, App Router)
- Create a new Supabase project; note the project URL and anon/service keys
- Install `@supabase/supabase-js` and `@supabase/ssr` for server-side auth handling in Next.js
- Set up `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client), `ANTHROPIC_API_KEY` (for the agent features)
- Push repo to GitHub, connect to Vercel, confirm environment variables are mirrored in Vercel's project settings

**Done when:** a blank Next.js app deployed on Vercel can successfully ping your Supabase project (e.g. a test query on load).

---

## Phase 2 — Database Schema & Auth

- Create tables in Supabase SQL editor:
  ```sql
  create table api_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    provider text not null,           -- 'anthropic' | 'openai' | 'bedrock_synthetic'
    label text,
    vault_secret_id uuid,             -- reference into Supabase Vault
    created_at timestamptz default now(),
    last_synced_at timestamptz
  );

  create table usage_records (
    id uuid primary key default gen_random_uuid(),
    connection_id uuid references api_connections not null,
    date date not null,
    model text not null,
    input_tokens bigint default 0,
    output_tokens bigint default 0,
    cost_usd numeric(10,4) default 0,
    created_at timestamptz default now()
  );
  ```
- Enable Row Level Security on both tables: users can only read/write rows tied to their own `user_id` (via a join on `api_connections` for `usage_records`)
- Set up Supabase Auth (email/password or OAuth, per Phase 0 decision), build `/login` and `/signup` pages
- Add a protected route wrapper/middleware so `/dashboard` redirects unauthenticated users to `/login`

**Done when:** you can sign up, log in, log out, and confirm RLS actually blocks one test user from seeing another test user's rows.

---

## Phase 3 — Secure Key Storage & Onboarding

- Build the "Connect a provider" screen: provider dropdown (Anthropic, OpenAI, Bedrock-synthetic), key input field, label field
- On submit: server-side route makes one lightweight validation call to the provider (e.g. a minimal usage-endpoint call) to confirm the key works before storing anything
- If valid, store the key via Supabase Vault (`vault.create_secret`), save the returned `vault_secret_id` in `api_connections`, never store the raw key in a normal column
- Add a "Remove connection" action that also deletes the Vault secret and cascades to delete associated `usage_records`
- Add the security disclaimer copy from Phase 0 to this screen, plus a note recommending a scoped/read-only key where the provider supports it

**Done when:** a real Anthropic or OpenAI key can be added, validated, and stored encrypted, and removing a connection cleanly deletes the secret.

---

## Phase 4 — Ingestion Pipeline (Backfill)

- Server-side function per provider:
  - **Anthropic**: call the Admin Usage and Cost API with the decrypted key, pull the last 30–90 days of daily usage by model/key
  - **OpenAI**: call the Usage/Costs API similarly
  - **Bedrock (synthetic)**: generate a realistic dataset instead of calling AWS — vary token counts and models (Nova Micro/Pro, Claude models via Bedrock) across a date range, with a random-walk-plus-weekly-seasonality pattern so it looks like real usage, not a flat line
- Normalize each provider's response into the shared `usage_records` shape and bulk-insert
- Wire this to the "Sync now" button in the dashboard, with a loading state and error handling (expired key, rate limit, network failure)
- Update `last_synced_at` on the `api_connections` row after a successful sync

**Done when:** clicking "Sync now" for a real Anthropic/OpenAI connection populates `usage_records` with real data, and adding a synthetic Bedrock connection populates it with clearly-labeled fake data.

---

## Phase 5 — Dashboard

- Build `/dashboard`: reads exclusively from `usage_records` (via Supabase client with RLS, or your own API route), never calls provider APIs at render time
- Charts (Recharts): total spend over time (line), spend by model (bar or pie), spend by provider (stacked bar)
- Summary cards at the top: total spend this period, period-over-period % change, most expensive model
- Empty state for users with no connections yet, pointing them back to onboarding

**Done when:** the dashboard renders fast (no external API wait) purely from cached data, and correctly reflects whatever's in `usage_records` for the logged-in user.

---

## Phase 6 — Anomaly Detection

- Compute a rolling average (e.g. 7-day) and flag any day where spend exceeds it by a chosen threshold (e.g. 2 standard deviations, or simply >50% above rolling average for a fast first pass)
- Surface flagged days as a visual marker on the spend-over-time chart, plus a small alert list ("Aug 24: spend was 3.2x your 7-day average")
- This becomes the trigger point for the anomaly explainer agent in Phase 9

**Done when:** at least one visibly flagged anomaly appears on real or synthetic data, with the threshold logic isolated in its own function for easy tuning.

---

## Phase 7 — Forecasting

- Decide implementation per Phase 0: either a small Python serverless function using `statsmodels`' Holt-Winters exponential smoothing, or a simpler day-of-week-aware linear regression computed client-side in JS
- Input: the user's daily spend history from `usage_records`; output: a projected spend line for the next 7–30 days with a confidence band
- Overlay the forecast on the existing spend-over-time chart, visually distinct from historical data (e.g. dashed line)

**Done when:** the chart shows a believable forward projection that updates when new data is synced.

---

## Phase 8 — Savings Simulator

- Build a small pricing reference table (per-model input/output cost per million tokens, for the models you're tracking) — keep this as a config file you can update manually rather than trying to live-fetch pricing
- UI: pick a workload (either an existing model/usage slice from their real data, or a manual token-count entry), select an alternative model, show the cost delta
- Surface a "you could save $X/month by switching Y workload to Z model" style callout, mirroring Ramp's own framing

**Done when:** selecting any tracked workload and an alternative model produces a correct, clearly-explained cost comparison.

---

## Phase 9 — Agent Features (Claude API tool use)

Build these in order of value, treating anything past the first as a stretch goal for the weekend:

1. **Spend briefing agent**: given a date range, the agent has tool access to functions like `get_spend_by_model()`, `get_spend_by_owner()`, `compare_to_previous_period()` (each a thin wrapper querying `usage_records`). Implement the standard tool-use loop: send the prompt + tool definitions to Claude, execute any `tool_use` blocks returned, feed results back, repeat until Claude returns a final text summary. Render that summary in a "Weekly Briefing" card on the dashboard.
2. **Anomaly explainer agent**: triggered when Phase 6 flags a spike; same tool-use pattern, but scoped to investigating one flagged day (which model, which connection, is it a one-off or a trend) and returning a short explanation attached to that alert.
3. **Ad hoc Q&A chat** (stretch): a simple chat UI where a logged-in user can ask free-form questions about their own spend; same underlying tool set as #1, just wrapped in a conversational loop instead of a scheduled/triggered one.

**Done when:** at minimum, the briefing agent produces a genuinely accurate, data-grounded summary for a real or synthetic dataset, with visible tool calls in your own logs/console proving it's actually querying data rather than hallucinating.

---

## Phase 10 — Security & Trust Polish

- Confirm no raw API key ever appears in client-side JS, logs, or error messages (test this by deliberately triggering an error and checking the browser console/network tab)
- Add basic rate limiting on the key-validation and sync endpoints (even a simple in-memory or Supabase-based counter is enough for a demo)
- Final pass on the disclaimer copy from Phase 0, visible before a user pastes any key

**Done when:** you'd be comfortable pasting a real, low-stakes API key into your own app and explaining exactly what happens to it, end to end.

---

## Phase 11 — Deploy & QA

- Final deploy: Next.js on Vercel, Supabase in production mode, environment variables confirmed on both sides
- End-to-end test: sign up as a fresh user, connect a real key, sync, view dashboard, trigger the briefing agent, run the savings simulator
- Confirm the synthetic Bedrock path works independently of whether a user has real Anthropic/OpenAI keys connected

**Done when:** a stranger could sign up and get a working demo experience without you standing behind them.

---

## Phase 12 — Outreach Prep

- Write a short README: what it does, why you built it (the gap it fills relative to Ramp's current provider list), the architecture diagram, and an honest note on what's synthetic vs real
- Record a short demo (screen recording or GIF) showing sign-up → connect → dashboard → briefing agent, in case Richard doesn't want to paste his own key into a stranger's app
- Draft the outreach message: one or two sentences naming the specific gap (Bedrock support) and linking the repo/live demo, per your usual outreach style

**Done when:** you have a live link, a repo, and a short message ready to send.

---

## Backlog / Future Phases (not this weekend)

- Automatic scheduled sync via Vercel Cron or `pg_cron`, replacing the manual "Sync now" button
- Gemini and Cursor provider support, matching Ramp's full current provider list
- Team/org-level views (multiple users sharing one workspace, like Ramp's actual product)
- Slack integration for the briefing agent, mirroring Ramp's own weekly-briefing delivery channel
