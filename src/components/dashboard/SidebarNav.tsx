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
  PanelLeft,
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

const EXPANDED_WIDTH = "16rem";
const COLLAPSED_WIDTH = "4.5rem";

export function SidebarNav({
  email,
  logoutAction,
}: {
  email: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  // Plain DOM mutation triggered by a user click, not render-driven state:
  // <main> (a sibling in dashboard/layout.tsx) reads this same CSS variable
  // for its left padding, so the two stay in sync without lifting state up
  // into a client-ified layout or prop-drilling across the boundary.
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.style.setProperty(
      "--sidebar-w",
      next ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    );
  }

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "bg-accent text-accent-foreground"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {!collapsed && (
        <p className="truncate text-xs text-zinc-500" title={email}>
          {email}
        </p>
      )}
      <form action={logoutAction} className={collapsed ? "mt-0" : "mt-2"}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          title={collapsed ? "Log out" : undefined}
          className="w-full"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {!collapsed && "Log out"}
        </Button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed, always visible, collapsible */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:gap-6 lg:overflow-y-auto lg:border-r lg:border-zinc-200 lg:bg-white lg:p-4 dark:lg:border-zinc-800 dark:lg:bg-black",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-64",
          "lg:transition-[width] lg:duration-200",
        )}
      >
        {/* Same flush, borderless icon-button style as every other sidebar
            control (no floating circle/border) -- when collapsed there's no
            room for the logo next to it, so the logo drops out entirely and
            the toggle sits alone at the top, same as it does in this
            component's other collapsed icons. */}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
          {!collapsed && (
            <Link href="/dashboard" className="px-1">
              <Logo size={22} />
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </Button>
        </div>
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
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col gap-6 overflow-y-auto bg-white p-4 shadow-lg dark:bg-black">
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
