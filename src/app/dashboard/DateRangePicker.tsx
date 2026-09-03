"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

// The caller must pass key={`${range}-${start}-${end}`} so this remounts
// (re-running the useState initializers below) whenever the confirmed
// range actually changes via navigation -- e.g. switching to a preset
// while the custom inputs were showing -- instead of syncing local state
// to props via an effect.
export function DateRangePicker({
  range,
  start,
  end,
  connectionId,
}: {
  range: string;
  start?: string;
  end?: string;
  connectionId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Selecting "custom" only reveals the date inputs locally -- it doesn't
  // navigate until Apply is clicked with both dates filled in. Without
  // this, picking "custom" with no dates yet would round-trip to the
  // server, get rejected (no valid start/end), and silently bounce back
  // to the 30-day default before the user could type anything.
  const [showCustom, setShowCustom] = useState(range === "custom");
  const [customStart, setCustomStart] = useState(start ?? "");
  const [customEnd, setCustomEnd] = useState(end ?? "");

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (connectionId) sp.set("connection", connectionId);
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  const onPresetChange = (value: string) => {
    if (value === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      navigate({ range: value });
    }
  };

  const applyCustom = () => {
    if (customStart && customEnd) navigate({ range: "custom", start: customStart, end: customEnd });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={showCustom ? "custom" : range}
        onChange={(e) => onPresetChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-foreground dark:border-zinc-700 dark:bg-zinc-950"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {showCustom && (
        <>
          <input
            type="date"
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-foreground dark:border-zinc-700 dark:bg-zinc-950"
            aria-label="Start date"
          />
          <span className="text-sm text-zinc-500">to</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-foreground dark:border-zinc-700 dark:bg-zinc-950"
            aria-label="End date"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={applyCustom}
            disabled={!customStart || !customEnd}
          >
            Apply
          </Button>
        </>
      )}
    </div>
  );
}
