import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Token Ledger
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        AI token spend tracker — scaffolding in progress. Landing page,
        public demo, and dashboard land in later phases.
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
