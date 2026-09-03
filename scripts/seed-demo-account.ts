// One-off script: creates (or reuses) a shared demo account and seeds it
// with synthetic Anthropic and OpenAI usage so a visitor can sign in and
// see a fully populated dashboard without connecting any real provider
// key. Only touches this one account -- regular signup/connection
// flows are completely untouched, and the demo-only synthetic generators
// (anthropic-synthetic.ts, openai-synthetic.ts) are never imported by app
// code, only by this script.
//
// Usage: npm run seed:demo
// Rotate the password on an existing demo account (e.g. after accidentally
// exposing it somewhere public -- the agent features hit a real Anthropic
// key, so a leaked login is a real cost risk): npm run seed:demo -- --rotate
//
// IMPORTANT: never hardcode a real password here. It's read from
// DEMO_SEED_PASSWORD (set it in .env.local, which is gitignored) with a
// random fallback so a fresh run never produces a fixed, guessable,
// committed credential. Share whatever password this prints directly with
// whoever should have access; don't post it anywhere public (landing page,
// README, issues, etc.).
//
// Safe to re-run without --rotate: reuses the existing user/connections
// instead of duplicating them, and usage_records are upserted on
// (connection_id, date, model), so re-running just refreshes the same
// deterministic dataset.

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { generateSyntheticAnthropicUsage } from "../src/lib/ingestion/anthropic-synthetic";
import { generateSyntheticOpenAIUsage } from "../src/lib/ingestion/openai-synthetic";
import type { NormalizedUsageRecord } from "../src/lib/ingestion/types";

const DEMO_EMAIL = "demo@tokenledger.example";
const DEMO_PASSWORD =
  process.env.DEMO_SEED_PASSWORD ?? "Demo-" + crypto.randomBytes(9).toString("base64url") + "!";
const CONNECTION_LABEL = "Demo data";
const SHOULD_ROTATE = process.argv.includes("--rotate");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateDemoUser(): Promise<string> {
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const existing = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    console.log(`Demo user already exists: ${existing.id}`);
    if (SHOULD_ROTATE) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      console.log("  password rotated");
    }
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  console.log(`Created demo user: ${data.user.id}`);
  return data.user.id;
}

async function getOrCreateConnection(userId: string, provider: string): Promise<string> {
  const { data: existing } = await admin
    .from("api_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("label", CONNECTION_LABEL)
    .maybeSingle();

  if (existing) {
    console.log(`  ${provider} connection already exists: ${existing.id}`);
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("api_connections")
    .insert({ user_id: userId, provider, label: CONNECTION_LABEL, vault_secret_id: null })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("connection insert returned no row");
  console.log(`  created ${provider} connection: ${data.id}`);
  return data.id as string;
}

async function seedUsage(connectionId: string, records: NormalizedUsageRecord[]) {
  if (records.length === 0) {
    console.log("  no records generated, skipping");
    return;
  }
  const rows = records.map((r) => ({ ...r, connection_id: connectionId }));
  const { error } = await admin.from("usage_records").upsert(rows, { onConflict: "connection_id,date,model" });
  if (error) throw error;
  await admin
    .from("api_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId);
  console.log(`  seeded ${records.length} usage records`);
}

async function main() {
  console.log("Seeding demo account...\n");
  const userId = await getOrCreateDemoUser();

  console.log("\nAnthropic (demo-only synthetic):");
  const anthropicId = await getOrCreateConnection(userId, "anthropic");
  await seedUsage(anthropicId, generateSyntheticAnthropicUsage(anthropicId));

  console.log("\nOpenAI (demo-only synthetic):");
  const openaiId = await getOrCreateConnection(userId, "openai");
  await seedUsage(openaiId, generateSyntheticOpenAIUsage(openaiId));

  console.log("\nDone.");
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
