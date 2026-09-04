import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchUsage } from "@/lib/agent/tools";
import { movingAverageSpend, spendByModel, spendByProvider } from "@/lib/dashboard/aggregate";
import { buildSpendTrendWorkbook } from "@/lib/reports/spend-trend-workbook";

const MAX_DAYS = 180;
const MAX_WINDOW = 30;

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function clampInt(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

// Same on-demand, nothing-persisted shape as the PDF report route (see
// spend-trend/route.ts): fully reproducible from live usage_records given
// a date range + window, so there's nothing to store or invalidate.
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const withinLimit = await checkRateLimit(`report:${user.id}`, RATE_LIMITS.report);
  if (!withinLimit) {
    return Response.json(
      { error: "You've hit the hourly limit for report downloads. Try again later." },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  const days = clampInt(url.searchParams.get("days"), 15, MAX_DAYS);
  const window = clampInt(url.searchParams.get("window"), 7, MAX_WINDOW);

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const periodStart = new Date(end);
  periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
  const fetchStart = new Date(end);
  fetchStart.setUTCDate(fetchStart.getUTCDate() - (days + window - 2));

  const rows = await fetchUsage(
    supabase,
    fetchStart.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  );
  const series = movingAverageSpend(rows, window).slice(-days);
  const totalSpend = series.reduce((sum, p) => sum + p.cost, 0);

  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodRows = rows.filter((r) => r.date >= periodStartStr);

  const workbook = await buildSpendTrendWorkbook({
    series,
    byModel: spendByModel(periodRows),
    byProvider: spendByProvider(periodRows),
    windowDays: window,
    totalSpend: Math.round(totalSpend * 100) / 100,
    avgCostPerDay: Math.round((totalSpend / days) * 100) / 100,
    rangeLabel: `${formatDate(periodStartStr)} – ${formatDate(end.toISOString().slice(0, 10))}`,
    generatedAt: new Date(),
  });

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="token-ledger-spend-export-${days}d.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
