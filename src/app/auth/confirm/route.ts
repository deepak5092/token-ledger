import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both the signup-confirmation link and the password-recovery
// link -- verifyOtp is generic over `type`, so no branching needed here.
// Requires the Supabase project's "Confirm signup" AND "Reset Password"
// email templates to link here with a token_hash, e.g.
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
// resetPasswordForEmail's redirectTo becomes {{ .RedirectTo }} in that
// template, so it only takes effect if the template actually references it
// (see requestPasswordReset in app/login/actions.ts). If "Reset Password"
// is still on Supabase's default template, its link bypasses this route
// entirely and /reset-password's session guard will reject it as expired.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Invalid or expired confirmation link.")}`,
  );
}
