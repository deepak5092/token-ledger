import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Handles the signup-confirmation link. Requires the Supabase project's
// "Confirm signup" email template to link here with a token_hash, e.g.
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
//
// Also *can* handle the password-recovery link the same way (verifyOtp is
// generic over `type`) if "Reset Password" is customized to match:
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
// That's optional, not required -- ResetPasswordGate (in
// components/auth/) handles Supabase's *default* recovery template too,
// whose link bypasses this route and lands on /reset-password with the
// session tokens in a URL hash instead.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Constrained to an on-origin path before it is concatenated onto
  // `origin` below -- `origin` carries no trailing slash, so an
  // unvalidated value like "@evil.com" would land in the authority
  // component and redirect off-site. An attacker can mint a valid
  // token_hash by signing up themselves, so verifyOtp succeeding is
  // not a meaningful barrier here.
  const next = safeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Signup-confirmation links get pre-fetched by email security scanners
    // (Microsoft Defender Safe Links, Proofpoint, etc.) before the user
    // clicks them, which silently consumes the single-use token and
    // confirms the account server-side. The user's own click then fails
    // verifyOtp even though their email is already confirmed -- so instead
    // of a scary "invalid link" error, point them straight at the login
    // form, where signing in will just work.
    if (type === "email") {
      return NextResponse.redirect(`${origin}/login?info=confirm`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Invalid or expired confirmation link.")}`,
  );
}
