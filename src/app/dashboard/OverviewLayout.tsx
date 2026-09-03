"use client";

import { useState, type ReactNode } from "react";
import { Bot, X } from "lucide-react";
import { AgentPanel } from "./AgentPanel";
import type { AnomalyPoint } from "@/lib/dashboard/anomaly";
import { cn } from "@/lib/cn";

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

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI insights" : "Open AI insights"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-colors hover:bg-accent-hover"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Bot className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}
