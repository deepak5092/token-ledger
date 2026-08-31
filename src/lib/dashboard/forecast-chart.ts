import type { AnomalyPoint } from "./anomaly";
import type { ForecastPoint } from "@/lib/forecast/client";

export type ChartPoint = {
  date: string;
  cost?: number;
  isAnomaly?: boolean;
  ratio?: number;
  forecastCost?: number;
  forecastLower?: number;
  forecastUpper?: number;
};

// Bridges the historical line and the dashed forecast line so they connect
// visually with no gap: the last historical point gets forecast fields
// equal to its own actual cost, then the forecast rows follow.
export function mergeForecast(
  history: AnomalyPoint[],
  forecast: ForecastPoint[] | null,
): ChartPoint[] {
  if (!forecast || forecast.length === 0 || history.length === 0) return history;

  const last = history[history.length - 1];
  const bridge: ChartPoint = {
    ...last,
    forecastCost: last.cost,
    forecastLower: last.cost,
    forecastUpper: last.cost,
  };

  const forecastRows: ChartPoint[] = forecast.map((f) => ({
    date: f.date,
    forecastCost: f.cost,
    forecastLower: f.lower,
    forecastUpper: f.upper,
  }));

  return [...history.slice(0, -1), bridge, ...forecastRows];
}
