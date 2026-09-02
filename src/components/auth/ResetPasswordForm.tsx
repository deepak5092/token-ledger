"use client";

import { useState, type FormEvent } from "react";
import { updatePassword } from "@/app/reset-password/actions";
import { Label, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { AuthSubmitButton } from "./AuthSubmitButton";

// Kept in sync with the server-side check in reset-password/actions.ts,
// which is the actual enforcement boundary; this copy only exists to fail
// fast and give an inline message before a round trip.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, including an uppercase letter, a number, and a special character.";

export function ResetPasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!PASSWORD_REGEX.test(password)) {
      e.preventDefault();
      setClientError(`Password must have ${PASSWORD_HINT.toLowerCase()}`);
      return;
    }
    if (password !== confirmPassword) {
      e.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
    setClientError(null);
  };

  return (
    <>
      {(clientError ?? error) && <Alert variant="error">{clientError ?? error}</Alert>}
      <form action={updatePassword} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-500">{PASSWORD_HINT}</p>
        </div>
        <div>
          <Label htmlFor="reset-confirm-password">Confirm new password</Label>
          <Input
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <AuthSubmitButton idleLabel="Set new password" pendingLabel="Saving…" />
      </form>
    </>
  );
}
