"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Kept in sync with the client-side check in ResetPasswordForm.tsx and the
// same rule enforced at signup (see signup/actions.ts) -- that copy only
// exists to fail fast; this is the actual enforcement boundary.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!PASSWORD_REGEX.test(password)) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
      )}`,
    );
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();

  // Relies on the recovery session /auth/confirm already established from
  // the emailed link; updateUser fails with no session, same as any other
  // unauthenticated call would.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
