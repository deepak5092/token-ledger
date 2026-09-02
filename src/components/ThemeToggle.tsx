"use client";

import { useEffect, useState } from "react";
import { Sun, Monitor, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

type ThemePreference = "light" | "system" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(pref: ThemePreference) {
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

// Lazy useState initializer, not an effect: runs once during the component's
// first render, safe on the server (returns the default before any DOM
// exists). The rendered output doesn't depend on this value until `mounted`
// flips true post-hydration, so there's no hydration-mismatch risk from
// reading a client-only value here.
function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
}

const CYCLE: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};

const LABEL: Record<ThemePreference, string> = {
  light: "Light",
  system: "System",
  dark: "Dark",
};

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>(getStoredPreference);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Standard SSR-safe "mounted" gate: server and the client's first
    // (pre-hydration) render both produce `false` here, so there's no
    // hydration mismatch; this only flips after hydration completes, which
    // is exactly what the lint rule's own suggested alternative describes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(pref);
    localStorage.setItem(STORAGE_KEY, pref);
  }, [pref, mounted]);

  useEffect(() => {
    if (pref !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [pref]);

  if (!mounted) {
    return <div className={cn("h-8 w-8", className)} aria-hidden />;
  }

  const Icon = ICON[pref];

  return (
    <button
      type="button"
      onClick={() => setPref(CYCLE[pref])}
      aria-label={`Theme: ${LABEL[pref]}. Click to switch to ${LABEL[CYCLE[pref]]}.`}
      title={`Theme: ${LABEL[pref]}`}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
