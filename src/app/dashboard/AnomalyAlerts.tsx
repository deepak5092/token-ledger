import type { AnomalyPoint } from "@/lib/dashboard/anomaly";

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function AnomalyAlerts({ points }: { points: AnomalyPoint[] }) {
  const anomalies = points
    .filter((p) => p.isAnomaly)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (anomalies.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No spend anomalies detected.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {anomalies.map((a) => (
        <li
          key={a.date}
          className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300"
        >
          <span aria-hidden>⚠</span>
          <span>
            {formatDate(a.date)}: spend was {a.ratio}x your 7-day average
          </span>
        </li>
      ))}
    </ul>
  );
}
