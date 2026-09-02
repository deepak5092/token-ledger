# Phase 0 Decisions

Fixed answers to the open questions in `ramp-project-implementation-phases.md` (in this same `docs/` folder),
so later phases build against a stable target.

## Architecture / stack
- Next.js (App Router) handles everything except forecasting.
- Forecasting (Phase 7) is a separate Python function using `statsmodels`
  Holt-Winters smoothing, deployed as a Vercel Python serverless function
  (`api/forecast.py` at the repo root, alongside the Next.js app), not a
  separately hosted service. Zero-config: a root `requirements.txt` plus a
  `handler(BaseHTTPRequestHandler)` class is Vercel's documented file-based
  Python convention, no `vercel.json` needed (an earlier one specifying
  `functions.runtime: "python3.12"` was invalid and broke every deploy from
  Phase 7 onward, and has since been removed).
- Supabase is accessed two ways: RLS-scoped reads/writes from Server
  Components and Route Handlers via `@supabase/ssr` (`src/lib/supabase/server.ts`),
  and a service-role client (`src/lib/supabase/admin.ts`) for server-only
  operations that must bypass RLS (Vault secret decryption, cross-user sync
  writes). The browser never talks to Supabase directly with the service
  role key, and never handles raw provider API keys.
- Supabase Vault is the primary plan for encrypted key storage; fall back to
  pgsodium/pgcrypto column-level encryption if Vault isn't available on the
  project tier (see `supabase/schema.sql` notes).

## Data model
- Schema draft lives in `supabase/schema.sql`. Mandatory `usage_records`
  fields: date, model, input_tokens, output_tokens, cost_usd. No separate
  project-tag/request-count columns for this build.
- Cost: prefer the provider's own reported cost when the API returns one;
  otherwise compute it from a manually-maintained pricing config
  (Phase 8's pricing table doubles as this fallback).
- Multiple `api_connections` rows are allowed per provider per user (no
  uniqueness constraint on `user_id + provider`), e.g. two OpenAI keys with
  different labels.

## User flow
A visitor lands on a public demo page backed by pre-loaded synthetic
Bedrock-style data (no signup required) so the product can be evaluated
without an account; from there they can sign up with email/password, land
on onboarding, connect a real Anthropic/OpenAI key (or add another
synthetic Bedrock connection), click "Sync now" to backfill usage, and see
their own dashboard, forecast, anomaly flags, and savings simulator driven
entirely by cached `usage_records`, with an agent panel that answers
questions about their spend using the same cached data via tool calls.
Sync is manual for this build; scheduled refresh is backlog.

## Auth
- Email/password only (no OAuth): fastest to stand up, no external app
  registration/callback config needed.

## Demo mode
- In scope for this build. A dedicated public route serves a fixed
  synthetic Bedrock-style dataset, no login wall.
- The demo's briefing agent makes **live** Claude API calls (not a
  pre-cached response) so visitors see it actually work, but is protected
  by strict rate limiting (per-IP + global daily cap) since it spends the
  developer's own Anthropic key, not the visitor's. See Phase 9/10 notes.

## Agent scope & key ownership
- Build order: (1) spend briefing agent (must-have), (2) anomaly explainer
  (stretch), (3) ad hoc Q&A chat (stretch).
- All agent calls use the developer's own `ANTHROPIC_API_KEY` (server-only),
  never a value pasted by the end user. This is a demo, not a product, so
  usage is capped via rate limiting rather than per-user billing.

## Security
- Raw provider API keys: validated once server-side, stored only via Vault
  (or the pgcrypto fallback), decrypted only inside server-side sync code,
  never returned to the client in any response, log, or error message.
- Rate limiting on the key-validation endpoint and the public demo's agent
  endpoint to prevent abuse of either as a free service.
