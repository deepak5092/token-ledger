import { requestPasswordReset } from "@/app/login/actions";
import { Label, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { AuthSubmitButton } from "./AuthSubmitButton";

export function ForgotPasswordForm({ error }: { error?: string }) {
  return (
    <>
      {error && <Alert variant="error">{error}</Alert>}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter the email on your account and we&apos;ll send a link to reset your
        password.
      </p>
      <form action={requestPasswordReset} className="space-y-4">
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" name="email" type="email" required />
        </div>
        <AuthSubmitButton idleLabel="Send reset link" pendingLabel="Sending…" />
      </form>
    </>
  );
}
