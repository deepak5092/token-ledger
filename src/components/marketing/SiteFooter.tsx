import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-zinc-200 px-6 py-8 text-sm text-zinc-500 sm:flex-row dark:border-zinc-800">
      <Logo size={18} />
      <div className="flex items-center gap-4">
        <Link href="/login" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Log in
        </Link>
        <Link href="/signup" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Sign up
        </Link>
      </div>
      <p>&copy; {new Date().getFullYear()} Token Ledger</p>
    </footer>
  );
}
