"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthOverlay } from "@/components/auth/AuthOverlay";

export function SiteHeader() {
  const { openLogin, openSignup } = useAuthOverlay();

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openLogin}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Log in
        </button>
        <button type="button" onClick={openSignup} className={buttonVariants({ size: "sm" })}>
          Get started
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
