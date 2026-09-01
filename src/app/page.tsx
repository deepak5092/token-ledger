import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Token Ledger
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Connect your own Anthropic or OpenAI usage data — or try a
        synthetic AWS Bedrock dataset with no key needed — and get a
        cached spend dashboard, forecasts, anomaly alerts, and a
        tool-using agent that can answer questions about your spend.
      </p>
      <p className="max-w-md text-xs text-zinc-500">
        This is a demo project, not a security-audited product. Provider
        keys are encrypted via Supabase Vault and decrypted only
        server-side — use a scoped, rotatable, low-spend key wherever
        your provider supports one.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
