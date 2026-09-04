import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@/lib/supabase/server";
import {
  dailySpend,
  spendByModel,
  spendByProvider,
  computeSummary,
  movingAverageSpend,
  type UsageRow,
} from "@/lib/dashboard/aggregate";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Exported so callers outside the agent tool loop (e.g. the PDF report
// route) can pull the same RLS-scoped rows without duplicating the query.
export async function fetchUsage(
  supabase: SupabaseServerClient,
  startDate?: string,
  endDate?: string,
): Promise<UsageRow[]> {
  let query = supabase
    .from("usage_records")
    .select("date, model, cost_usd, input_tokens, output_tokens, api_connections(provider)")
    .order("date", { ascending: true });
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  const { data } = await query.returns<UsageRow[]>();
  return data ?? [];
}

const dateRangeSchema = {
  type: "object" as const,
  properties: {
    start_date: { type: "string", description: "YYYY-MM-DD, inclusive." },
    end_date: { type: "string", description: "YYYY-MM-DD, inclusive." },
  },
};

// Thin, read-only wrappers over usage_records: every result is scoped to
// the signed-in user via the RLS-scoped supabase client passed in, never a
// service-role client. This is the tool surface for Phase 9's agent
// features (weekly briefing, anomaly explainer, ad hoc Q&A chat).
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_spend_by_model",
    description:
      "Total spend in USD grouped by model, for an optional date range. Omit either bound for an open range.",
    input_schema: dateRangeSchema,
  },
  {
    name: "get_spend_by_provider",
    description:
      "Total spend in USD grouped by provider (anthropic / openai), for an optional date range.",
    input_schema: dateRangeSchema,
  },
  {
    name: "get_daily_spend",
    description: "Daily total spend in USD as a time series, for an optional date range.",
    input_schema: dateRangeSchema,
  },
  {
    name: "compare_to_previous_period",
    description:
      "Compares total spend in the trailing N days against the N days immediately before that, with percent change and the single most expensive model overall.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Period length in days. Defaults to 30." },
      },
    },
  },
  {
    name: "get_spend_trend",
    description:
      "Daily spend in USD for the trailing N days, each day annotated with its trailing moving average (e.g. a 7-day average), plus the average spend per day across the whole period. Use this for 'what was my average daily spend' or 'show a moving average' questions.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many trailing days to cover. Defaults to 15." },
        window: {
          type: "number",
          description: "Moving-average window size in days. Defaults to 7.",
        },
      },
    },
  },
  {
    name: "get_usage_for_date",
    description:
      "Per-model, per-connection breakdown of usage and cost for one specific date. Use this to investigate what drove a spend spike on that day.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
  {
    name: "generate_spend_report",
    description:
      "Generates a downloadable PDF report covering the trailing N days: daily spend, a moving-average trend chart, and summary stats. Call this when the user asks for a report, export, or PDF. The download link is shown to the user automatically by the UI, so do not repeat the raw URL in your reply -- just briefly confirm what the report covers.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many trailing days to cover. Defaults to 15." },
        window: {
          type: "number",
          description: "Moving-average window size in days. Defaults to 7.",
        },
      },
    },
  },
];

export async function executeAgentTool(
  supabase: SupabaseServerClient,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  // Proof the agent is actually querying data, not hallucinating: visible
  // in server logs for every tool call it makes.
  console.log("[agent] tool call:", name, input);

  const startDate = typeof input.start_date === "string" ? input.start_date : undefined;
  const endDate = typeof input.end_date === "string" ? input.end_date : undefined;

  switch (name) {
    case "get_spend_by_model": {
      const rows = await fetchUsage(supabase, startDate, endDate);
      return spendByModel(rows);
    }
    case "get_spend_by_provider": {
      const rows = await fetchUsage(supabase, startDate, endDate);
      return spendByProvider(rows);
    }
    case "get_daily_spend": {
      const rows = await fetchUsage(supabase, startDate, endDate);
      return dailySpend(rows);
    }
    case "compare_to_previous_period": {
      const days = typeof input.days === "number" ? input.days : 30;
      const rows = await fetchUsage(supabase);
      const end = new Date();
      end.setUTCHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - (days - 1));
      return computeSummary(rows, { start, end });
    }
    case "get_spend_trend": {
      const days = typeof input.days === "number" && input.days > 0 ? input.days : 15;
      const window = typeof input.window === "number" && input.window > 0 ? input.window : 7;

      const end = new Date();
      end.setUTCHours(0, 0, 0, 0);
      // Fetch `window - 1` extra days of lookback so the moving average is
      // already full-window for every day of the requested period, instead
      // of reporting null/partial averages for its first `window - 1` days.
      const fetchStart = new Date(end);
      fetchStart.setUTCDate(fetchStart.getUTCDate() - (days + window - 2));

      const rows = await fetchUsage(
        supabase,
        fetchStart.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
      );
      const withMovingAvg = movingAverageSpend(rows, window);
      const series = withMovingAvg.slice(-days);
      const totalSpend = series.reduce((sum, p) => sum + p.cost, 0);

      return {
        window_days: window,
        series,
        avg_cost_per_day: Math.round((totalSpend / days) * 100) / 100,
        total_spend: Math.round(totalSpend * 100) / 100,
      };
    }
    case "generate_spend_report": {
      const days = typeof input.days === "number" && input.days > 0 ? input.days : 15;
      const window = typeof input.window === "number" && input.window > 0 ? input.window : 7;
      return {
        report_url: `/api/reports/spend-trend?days=${days}&window=${window}`,
        days,
        window,
      };
    }
    case "get_usage_for_date": {
      const date = typeof input.date === "string" ? input.date : undefined;
      if (!date) return { error: "date is required" };
      const { data } = await supabase
        .from("usage_records")
        .select("model, input_tokens, output_tokens, cost_usd, api_connections(provider, label)")
        .eq("date", date);
      return data ?? [];
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
