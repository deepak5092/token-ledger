"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bot, X } from "lucide-react";
import { AgentPanel } from "./AgentPanel";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";
import { cn } from "@/lib/cn";

const NUDGE_DELAY_MS = 3500;
const NUDGE_AUTO_HIDE_MS = 6000;

// Fires 3 pulses, one every 10s starting right at page load, then stops --
// not an infinite animate-ping loop. Fresh on every visit since this is
// plain component state with no persistence, exactly like the nudge above.
const PULSE_INTERVAL_MS = 10000;
const PULSE_VISIBLE_MS = 1000; // matches Tailwind's animate-ping cycle length
const PULSE_COUNT = 3;

// One-time nudge toward the toggle button: fires once per page load (only
// while the panel is still closed), then hides itself again if ignored so
// it doesn't sit there forever. Its own mount -> rAF -> class-flip is a
// plain-Tailwind fade/slide-in -- this project doesn't have the
// tailwindcss-animate plugin, so there's no animate-in/fade-in utility to
// reach for.
function Nudge({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "max-w-[220px] rounded-2xl rounded-br-sm border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-foreground shadow-lg transition-all duration-300 dark:border-zinc-700 dark:bg-zinc-950",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      Got a question about your spend? Ask the AI panel.
    </button>
  );
}

// AI insights panel starts collapsed -- opening it via the floating button
// pushes the main content grid over to make room (same idea as the nav
// sidebar's own collapse toggle) rather than overlaying it.
export function OverviewLayout({
  spendWithAnomalies,
  children,
}: {
  spendWithAnomalies: AnomalyPoint[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [pulseOn, setPulseOn] = useState(false);

  useEffect(() => {
    if (open) return;
    const showTimer = setTimeout(() => setShowNudge(true), NUDGE_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [open]);

  useEffect(() => {
    if (!showNudge) return;
    const hideTimer = setTimeout(() => setShowNudge(false), NUDGE_AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [showNudge]);

  useEffect(() => {
    if (open) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < PULSE_COUNT; i++) {
      const delay = i * PULSE_INTERVAL_MS;
      timers.push(setTimeout(() => setPulseOn(true), delay));
      timers.push(setTimeout(() => setPulseOn(false), delay + PULSE_VISIBLE_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    setShowNudge(false);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "grid grid-cols-1 gap-8 transition-[grid-template-columns] duration-200",
          open && "lg:grid-cols-[1fr_320px]",
        )}
      >
        <div className="space-y-8">{children}</div>

        {open && (
          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <AgentPanel spendWithAnomalies={spendWithAnomalies} />
          </aside>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {showNudge && !open && <Nudge onOpen={openPanel} />}

        <div className="relative">
          {pulseOn && !open && (
            <span
              className="absolute inset-0 animate-ping rounded-full bg-accent opacity-75"
              aria-hidden
            />
          )}
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : openPanel())}
            aria-label={open ? "Close AI insights" : "Open AI insights"}
            aria-expanded={open}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-colors hover:bg-accent-hover"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Bot className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
