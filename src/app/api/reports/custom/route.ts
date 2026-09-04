import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchUsage } from "@/lib/agent/tools";
import { dailyMetric, groupedMetric, isMetric, METRIC_LABEL, type Metric } from "@/lib/reports/metrics";
import { buildCustomPdf, type CustomReportInput } from "@/lib/reports/custom-pdf";
import { buildCustomWorkbook } from "@/lib/reports/custom-workbook";

const MAX_DAYS = 180;
const MAX_WINDOW = 30;
const MAX_METRICS = 4;

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

function parseMetrics(raw: string | null): Metric[] {
  const requested = (raw ?? "cost").split(",").map((s) => s.trim());
  const metrics = Array.from(new Set(requested.filter(isMetric)));
  return (metrics.length > 0 ? metrics : (["cost"] as Metric[])).slice(0, MAX_METRICS);
}

// Every field of the report is decided live by the agent (from the
// user's own words), not picked from a fixed set of preset reports -- this
// route just faithfully renders whatever spec it's given, on demand,
// straight from live usage_records.
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
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const days = clampInt(url.searchParams.get("days"), 15, MAX_DAYS);
  const metrics = parseMetrics(url.searchParams.get("metrics"));
  const groupBy =
    url.searchParams.get("group_by") === "model" || url.searchParams.get("group_by") === "provider"
      ? (url.searchParams.get("group_by") as "model" | "provider")
      : "day";
  const movingAverageWindow =
    groupBy === "day" && url.searchParams.get("window")
      ? clampInt(url.searchParams.get("window"), 7, MAX_WINDOW)
      : null;
  const compare = url.searchParams.get("compare") === "true";
  const title = url.searchParams.get("title")?.trim() || defaultTitle(metrics, groupBy, days);

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const periodStart = new Date(end);
  periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
  const fetchStart = new Date(end);
  // Extra lookback only matters for a day-series moving average; grouping
  // by model/provider has no such concept.
  const lookbackDays = movingAverageWindow ? days + movingAverageWindow - 2 : days - 1;
  fetchStart.setUTCDate(fetchStart.getUTCDate() - lookbackDays);

  const rows = await fetchUsage(
    supabase,
    fetchStart.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  );
  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodRows = rows.filter((r) => r.date >= periodStartStr);

  const input: CustomReportInput = {
    title,
    rangeLabel: `${formatDate(periodStartStr)} – ${formatDate(end.toISOString().slice(0, 10))}`,
    generatedAt: new Date(),
    metrics,
    groupBy,
    movingAverageWindow,
    compare,
    dayData: {},
    groupData: {},
  };

  if (groupBy === "day") {
    for (const metric of metrics) {
      input.dayData[metric] = dailyMetric(rows, metric, movingAverageWindow).slice(-days);
    }
  } else {
    for (const metric of metrics) {
      input.groupData[metric] = groupedMetric(periodRows, metric, groupBy);
    }
  }

  const body = format === "xlsx" ? await buildCustomWorkbook(input) : await buildCustomPdf(input);
  const filenameBase = sanitizeFilename(title);

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}

function defaultTitle(metrics: Metric[], groupBy: "day" | "model" | "provider", days: number): string {
  const metricLabel = metrics.map((m) => METRIC_LABEL[m]).join(" & ");
  const scope = groupBy === "day" ? `last ${days} days` : `by ${groupBy}, last ${days} days`;
  return `${metricLabel} — ${scope}`;
}

function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[^a-zA-Z0-9 &-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "token-ledger-report";
}
