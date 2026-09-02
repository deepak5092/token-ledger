import Link from "next/link";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Get started
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
