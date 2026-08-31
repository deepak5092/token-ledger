import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Confirms the app can reach the configured Supabase project. Calling
// auth.getUser() works against any valid project even before any tables
// exist, so this is a safe "is the connection wired up" check.
export async function GET() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { supabase: "not_configured", message: "Missing Supabase env vars." },
      { status: 500 },
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();

    // "Auth session missing" just means no one is logged in yet — that's
    // still a successful round trip to the project.
    if (error && error.name !== "AuthSessionMissingError") {
      return NextResponse.json(
        { supabase: "error", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ supabase: "ok" });
  } catch (err) {
    return NextResponse.json(
      {
        supabase: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
