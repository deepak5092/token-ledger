import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConnection, type SyncableConnection } from "@/lib/sync/syncConnection";

export const dynamic = "force-dynamic";
// Vercel Cron's own invocation timeout is longer than the default function
// timeout; raise this route's ceiling so syncing many connections
// sequentially (deliberate -- see the loop below) doesn't get cut off
// mid-run. Hobby plans cap at 60s regardless of this value.
export const maxDuration = 300;

// Scheduled by vercel.json's crons entry, not user-triggered -- there is
// no "Sync now" button anymore. Vercel signs cron requests with this
// bearer token automatically when CRON_SECRET is set in the project's env
// vars; anything else (a stray request, a scan) gets rejected here before
// touching the service-role client.
// Constant-time compare so the number of matching leading bytes can't be
// inferred from response timing. Hashing first gives both sides a fixed,
// equal length, which timingSafeEqual requires (it throws otherwise, and
// a length check before it would leak the secret's length by itself).
function matchesCronSecret(authHeader: string | null, secret: string): boolean {
  const provided = createHash("sha256").update(authHeader ?? "").digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(provided, expected);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !matchesCronSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("api_connections")
    .select("id, provider, vault_secret_id")
    .not("vault_secret_id", "is", null)
    .returns<SyncableConnection[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Sequential, not Promise.all: this fans out across every user's real
  // provider keys, and staying sequential keeps it from bursting past any
  // one provider's rate limits if several connections hit the same org.
  for (const connection of connections ?? []) {
    try {
      await syncConnection(admin, connection);
      synced++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${connection.id} (${connection.provider}): ${message}`);
      console.error("[cron/sync] connection failed", { connectionId: connection.id, error: message });
    }
  }

  return NextResponse.json({ synced, failed, errors });
}
