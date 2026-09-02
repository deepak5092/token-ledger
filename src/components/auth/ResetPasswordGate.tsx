"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/Button";
import { ResetPasswordForm } from "./ResetPasswordForm";

type Status = "checking" | "ready" | "invalid";

// Supabase's default "Reset Password" email template links straight here
// with the recovery tokens in the URL hash (#access_token=...&type=
// recovery&refresh_token=...) instead of routing through /auth/confirm's
// token_hash flow -- the hash never reaches the server, so the session has
// to be established client-side. If /auth/confirm *did* run first (a
// custom token_hash-based template, like signup's), there's no hash here
// but a session cookie already exists, which getSession() below picks up
// just the same -- so this works with either template shape and doesn't
// require the Supabase dashboard to be reconfigured.
export function ResetPasswordGate({ error }: { error?: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function run() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Recovery tokens are single-use and sensitive; drop them from the
        // URL (history, referrers) the moment they've been exchanged.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (error || !data.session) {
          setStatus("invalid");
          return;
        }
        setEmail(data.session.user.email ?? null);
        setStatus("ready");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus("invalid");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setStatus("ready");
    }

    run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Logo />

        {status === "checking" && <p className="text-sm text-zinc-500">Checking your link…</p>}

        {status === "invalid" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Link invalid or expired</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Request a new password reset link and try again.
            </p>
            <Link href="/login" className={buttonVariants({ className: "w-full" })}>
              Back to log in
            </Link>
          </>
        )}

        {status === "ready" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
              {email && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">for {email}</p>
              )}
            </div>
            <ResetPasswordForm error={error} />
          </>
        )}
      </div>
    </div>
  );
}
