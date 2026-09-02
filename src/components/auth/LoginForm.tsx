"use client";

import { login } from "@/app/login/actions";
import { Label, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { useAuthOverlay } from "./AuthOverlay";

export function LoginForm({
  error,
  resetSent,
  next,
}: {
  error?: string;
  resetSent?: boolean;
  next?: string;
}) {
  const { openForgot } = useAuthOverlay();

  return (
    <>
      {error && <Alert variant="error">{error}</Alert>}
      {resetSent && (
        <Alert variant="info">
          If an account exists for that email, a reset link is on its way.
        </Alert>
      )}
      <form action={login} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" name="password" type="password" required minLength={6} />
          <button
            type="button"
            onClick={openForgot}
            className="mt-1.5 text-xs font-medium text-zinc-500 underline hover:text-foreground"
          >
            Forgot password?
          </button>
        </div>
        <AuthSubmitButton idleLabel="Log in" pendingLabel="Logging in…" />
      </form>
    </>
  );
}
