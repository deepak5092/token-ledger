import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Dashboard
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Log out
          </button>
        </form>
      </div>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Signed in as {user?.email}
      </p>
      <Link
        href="/dashboard/connections"
        className="mt-4 inline-block text-sm font-medium underline"
      >
        Manage connections
      </Link>
      <p className="mt-8 text-sm text-zinc-500">
        Usage charts and everything else land in later phases.
      </p>
    </div>
  );
}
