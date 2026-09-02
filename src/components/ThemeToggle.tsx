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

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
];

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
    return <div className={cn("h-8 w-[84px]", className)} aria-hidden />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700",
        className,
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={pref === opt.value}
          aria-label={opt.label}
          onClick={() => setPref(opt.value)}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            pref === opt.value
              ? "bg-accent text-accent-foreground"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <opt.icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
