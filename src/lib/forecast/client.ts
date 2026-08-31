export type ForecastPoint = {
  date: string;
  cost: number;
  lower: number;
  upper: number;
};

// Calls the Python Holt-Winters forecasting function (api/forecast.py).
// That function only runs under Vercel's Python runtime — it is NOT served
// by plain `next dev` locally, so this always fails in local development
// and the caller must treat a null return as "forecast unavailable" rather
// than an error.
export async function fetchForecast(
  history: { date: string; cost: number }[],
  days = 14,
): Promise<ForecastPoint[] | null> {
  if (history.length === 0) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, days }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return Array.isArray(data.forecast) ? data.forecast : null;
  } catch {
    return null;
  }
}
