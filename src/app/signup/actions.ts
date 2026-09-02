"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The client-side check in SignupForm.tsx is UX only; this is the actual
// enforcement boundary, since a request here doesn't have to go through
// that form.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!PASSWORD_REGEX.test(password)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
      )}`,
    );
  }
  if (password !== confirmPassword) {
    redirect(`/signup?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // "Confirm email" is enabled on the project: no session yet, user needs
  // to click the link. Disabled: signUp already returned a live session.
  if (!data.session) {
    redirect("/signup?checkEmail=1");
  }

  redirect("/dashboard");
}
