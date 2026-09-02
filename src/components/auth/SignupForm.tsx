"use client";

import { useState, type FormEvent } from "react";
import { signup } from "@/app/signup/actions";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

// Kept in sync with the server-side check in app/signup/actions.ts, which is
// the actual enforcement boundary; this copy only exists to fail fast and
// give an inline message before a round trip.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters, including an uppercase letter, a number, and a special character.";

export function SignupForm({ error, checkEmail }: { error?: string; checkEmail?: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  if (checkEmail) {
    return (
      <Alert variant="info">
        Check your email for a confirmation link to finish creating your account.
      </Alert>
    );
  }

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
      <form action={signup} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
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
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Sign up
        </Button>
      </form>
    </>
  );
}
