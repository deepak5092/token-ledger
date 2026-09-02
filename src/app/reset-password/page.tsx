import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

// Reached only via the emailed reset link, which /auth/confirm verifies
// and turns into a session before redirecting here -- so no session means
// an invalid or expired link, not just "logged out".
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent("That reset link is invalid or has expired. Request a new one.")}`,
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Logo />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            for {user.email}
          </p>
        </div>
        <ResetPasswordForm error={error} />
      </div>
    </div>
  );
}
