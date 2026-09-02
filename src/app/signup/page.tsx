import Link from "next/link";
import { signup } from "./actions";
import { Logo } from "@/components/Logo";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-semibold text-foreground">Sign up</h1>

        {checkEmail ? (
          <Alert variant="info">
            Check your email for a confirmation link to finish creating your
            account.
          </Alert>
        ) : (
          <>
            {error && <Alert variant="error">{error}</Alert>}

            <form action={signup} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Sign up
              </Button>
            </form>
          </>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
