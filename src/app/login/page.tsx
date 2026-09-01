import Link from "next/link";
import { login } from "./actions";
import { Logo } from "@/components/Logo";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>

        <h1 className="text-2xl font-semibold text-foreground">Log in</h1>

        {error && <Alert variant="error">{error}</Alert>}

        <form action={login} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Log in
          </Button>
        </form>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
