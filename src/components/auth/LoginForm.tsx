import { login } from "@/app/login/actions";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function LoginForm({ error, next }: { error?: string; next?: string }) {
  return (
    <>
      {error && <Alert variant="error">{error}</Alert>}
      <form action={login} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" name="password" type="password" required minLength={6} />
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Log in
        </Button>
      </form>
    </>
  );
}
