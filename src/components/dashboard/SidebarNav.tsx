"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plug,
  Calculator,
  MessagesSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/connections", label: "Connections", icon: Plug },
  { href: "/dashboard/simulator", label: "Simulator", icon: Calculator },
  { href: "/dashboard/agent", label: "Ask agent", icon: MessagesSquare },
];

export function SidebarNav({
  email,
  logoutAction,
}: {
  email: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="truncate text-xs text-zinc-500" title={email}>
        {email}
      </p>
      <form action={logoutAction} className="mt-2">
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </Button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed, always visible */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:gap-6 lg:border-r lg:border-zinc-200 lg:bg-white lg:p-4 dark:lg:border-zinc-800 dark:lg:bg-black">
        <Link href="/dashboard" className="px-1">
          <Logo size={22} />
        </Link>
        {navLinks()}
        {footer}
      </aside>

      {/* Mobile: sticky top bar with hamburger */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black lg:hidden">
        <Link href="/dashboard">
          <Logo size={20} />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      {/* Mobile: slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col gap-6 bg-white p-4 shadow-lg dark:bg-black">
            <div className="flex items-center justify-between">
              <Logo size={20} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            {navLinks(() => setOpen(false))}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
